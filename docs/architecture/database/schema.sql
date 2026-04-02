-- =============================================================================
-- PLATAFORMA MULTI-TENANT DE DELIVERY — SCHEMA COMPLETO
-- =============================================================================
-- Versão:     1.0.0
-- Autor:      Dara (@data-engineer)
-- Data:       2026-04-01
-- Estratégia: Row-Level Security (RLS) com tenant_id em todas as tabelas
-- DB:         Supabase (PostgreSQL 15+)
-- Referência: docs/architecture/fullstack-architecture.md
-- =============================================================================

-- =============================================================================
-- EXTENSÕES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";   -- busca fuzzy em produtos
CREATE EXTENSION IF NOT EXISTS "unaccent";  -- busca sem acentos

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE plano_saas AS ENUM ('starter', 'pro', 'scale');

CREATE TYPE order_status AS ENUM (
  'pending_payment',
  'payment_confirmed',
  'preparing',
  'ready_for_pickup',
  'out_for_delivery',
  'delivered',
  'cancelled'
);

CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'debit_card');

CREATE TYPE payment_status AS ENUM (
  'pending',
  'processing',
  'confirmed',
  'failed',
  'refunded'
);

CREATE TYPE notification_channel AS ENUM ('push', 'sms', 'whatsapp', 'email');

-- =============================================================================
-- SCHEMA: PUBLIC (multi-tenant)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- TABLE: tenants
-- Registro master de cada restaurante/tenant. NÃO tem RLS (é a tabela de
-- controle), mas é acessível apenas via service_role ou queries diretas
-- de resolução (sem RLS ativo).
-- -----------------------------------------------------------------------------
CREATE TABLE tenants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL UNIQUE,           -- subdomínio: restaurante.plataforma.com
  nome              TEXT NOT NULL,
  custom_domain     TEXT UNIQUE,                    -- delivery.restaurante.com.br
  plano             plano_saas NOT NULL DEFAULT 'starter',
  ativo             BOOLEAN NOT NULL DEFAULT true,

  -- Branding
  logo_url          TEXT,
  banner_url        TEXT,
  cor_primaria      TEXT NOT NULL DEFAULT '#FF6B35', -- hex
  cor_primaria_texto TEXT NOT NULL DEFAULT '#FFFFFF',

  -- Configurações operacionais (JSONB para flexibilidade)
  config            JSONB NOT NULL DEFAULT '{
    "frete_base": 5.00,
    "frete_gratis_acima": 50.00,
    "raio_entrega_km": 5,
    "tempo_preparo_min": 30,
    "aceita_agendamento": false
  }'::JSONB,

  -- Horários de funcionamento
  horarios          JSONB NOT NULL DEFAULT '{
    "segunda":  {"aberto": true,  "inicio": "11:00", "fim": "22:00"},
    "terca":    {"aberto": true,  "inicio": "11:00", "fim": "22:00"},
    "quarta":   {"aberto": true,  "inicio": "11:00", "fim": "22:00"},
    "quinta":   {"aberto": true,  "inicio": "11:00", "fim": "22:00"},
    "sexta":    {"aberto": true,  "inicio": "11:00", "fim": "23:00"},
    "sabado":   {"aberto": true,  "inicio": "11:00", "fim": "23:00"},
    "domingo":  {"aberto": true,  "inicio": "11:00", "fim": "21:00"}
  }'::JSONB,

  -- Integração de pagamento (criptografar na aplicação antes de salvar)
  pagamento_config  JSONB,  -- { "pagame_api_key_hash": "...", "pagame_webhook_secret_hash": "..." }

  -- Metadados
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS 'Registro master de cada restaurante/tenant. Sem RLS — resolvido via service_role na camada de middleware.';
COMMENT ON COLUMN tenants.config IS 'Configurações operacionais: frete, raio de entrega, tempo de preparo.';
COMMENT ON COLUMN tenants.pagamento_config IS 'Credenciais do gateway de pagamento. NUNCA armazenar em plaintext — hash/encrypt na aplicação.';

-- -----------------------------------------------------------------------------
-- TABLE: tenant_users
-- Clientes finais. Cada usuário pertence a UM tenant. Um mesmo e-mail pode
-- ter conta em múltiplos tenants (são registros distintos).
-- -----------------------------------------------------------------------------
CREATE TABLE tenant_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  nome          TEXT NOT NULL,
  telefone      TEXT,
  email_verificado BOOLEAN NOT NULL DEFAULT false,
  ativo         BOOLEAN NOT NULL DEFAULT true,

  -- Autenticação (gerenciada pelo NextAuth.js — este campo é o link)
  auth_user_id  UUID,  -- referência ao auth.users do Supabase (se usar Supabase Auth)

  -- Preferências
  enderecos     JSONB NOT NULL DEFAULT '[]'::JSONB,  -- array de endereços salvos
  preferencias  JSONB NOT NULL DEFAULT '{}'::JSONB,

  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, email)  -- mesmo email OK em tenants distintos
);

COMMENT ON TABLE tenant_users IS 'Clientes finais. Scoped por tenant_id. Um email pode existir em múltiplos tenants.';
COMMENT ON COLUMN tenant_users.enderecos IS 'Array JSON: [{ "label": "Casa", "logradouro": "...", "numero": "...", "bairro": "...", "cidade": "...", "cep": "...", "complemento": "...", "lat": -23.5, "lng": -46.6 }]';

-- -----------------------------------------------------------------------------
-- TABLE: product_categories
-- Categorias do cardápio (Ex: Entradas, Pratos Principais, Bebidas, Sobremesas)
-- -----------------------------------------------------------------------------
CREATE TABLE product_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  imagem_url  TEXT,
  ordem       INTEGER NOT NULL DEFAULT 0,  -- ordenação no cardápio
  ativo       BOOLEAN NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- TABLE: products
-- Itens do cardápio. Suporte a customizações via JSONB.
-- -----------------------------------------------------------------------------
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  categoria_id    UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  preco           NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
  foto_url        TEXT,
  disponivel      BOOLEAN NOT NULL DEFAULT true,
  ordem           INTEGER NOT NULL DEFAULT 0,

  -- Customizações: tamanhos, adicionais, observações
  -- Ex: [{ "grupo": "Tamanho", "obrigatorio": true, "opcoes": [{ "nome": "P", "preco_adicional": 0 }, { "nome": "G", "preco_adicional": 5 }] }]
  customizacoes   JSONB NOT NULL DEFAULT '[]'::JSONB,

  -- Metadados nutricionais (opcional, fase 2)
  metadados       JSONB NOT NULL DEFAULT '{}'::JSONB,

  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN products.customizacoes IS 'Array de grupos de customização. Ex: tamanho, adicionais, observação livre.';

-- -----------------------------------------------------------------------------
-- TABLE: orders
-- Pedidos realizados. Coração do sistema.
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id           UUID REFERENCES tenant_users(id) ON DELETE SET NULL,  -- NULL = pedido anônimo (futuro)

  -- Valores financeiros (NUMERIC para precisão monetária — nunca FLOAT)
  subtotal          NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  frete             NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (frete >= 0),
  desconto          NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),
  total             NUMERIC(10, 2) NOT NULL CHECK (total >= 0),

  -- Status
  status            order_status NOT NULL DEFAULT 'pending_payment',

  -- Endereço de entrega (snapshot no momento do pedido)
  endereco_entrega  JSONB NOT NULL,
  -- { "logradouro": "...", "numero": "...", "bairro": "...", "cidade": "...", "cep": "...", "complemento": "...", "lat": -23.5, "lng": -46.6 }

  -- Pagamento
  metodo_pagamento  payment_method NOT NULL,
  pagamento_status  payment_status NOT NULL DEFAULT 'pending',
  pagamento_id_externo TEXT,  -- ID do Pagar.me
  pagamento_qr_code TEXT,     -- QR code PIX (se aplicável)

  -- Timestamps de transição de status
  pago_em           TIMESTAMPTZ,
  aceito_em         TIMESTAMPTZ,
  preparando_em     TIMESTAMPTZ,
  pronto_em         TIMESTAMPTZ,
  saiu_em           TIMESTAMPTZ,
  entregue_em       TIMESTAMPTZ,
  cancelado_em      TIMESTAMPTZ,
  motivo_cancelamento TEXT,

  -- Estimativa de entrega
  tempo_estimado_min INTEGER,

  -- Metadados
  notas_cliente     TEXT,       -- observações gerais do pedido
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE orders IS 'Pedidos realizados. Status controlado via order_status enum. Supabase Realtime monitora mudanças de status.';
COMMENT ON COLUMN orders.total IS 'total = subtotal + frete - desconto. Calculado e validado na aplicação antes de inserir.';

-- -----------------------------------------------------------------------------
-- TABLE: order_items
-- Itens de cada pedido. Snapshot de preço e nome no momento da compra.
-- -----------------------------------------------------------------------------
CREATE TABLE order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,  -- denormalizado para RLS
  product_id        UUID REFERENCES products(id) ON DELETE SET NULL,  -- NULL se produto deletado

  -- Snapshot (preserva dados históricos mesmo se produto mudar)
  produto_nome      TEXT NOT NULL,
  produto_foto_url  TEXT,
  preco_unitario    NUMERIC(10, 2) NOT NULL CHECK (preco_unitario >= 0),
  quantidade        INTEGER NOT NULL CHECK (quantidade > 0),
  preco_total       NUMERIC(10, 2) NOT NULL CHECK (preco_total >= 0),

  -- Customizações selecionadas (snapshot)
  customizacoes_selecionadas JSONB NOT NULL DEFAULT '[]'::JSONB,
  -- [{ "grupo": "Tamanho", "opcao": "G", "preco_adicional": 5 }]

  notas             TEXT,  -- observação específica do item

  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE order_items IS 'Itens do pedido com snapshot de preço e nome — preserva histórico mesmo se produto for alterado.';

-- -----------------------------------------------------------------------------
-- TABLE: notifications
-- Log de notificações enviadas (push, SMS, WhatsApp, email)
-- -----------------------------------------------------------------------------
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  canal       notification_channel NOT NULL,
  titulo      TEXT,
  mensagem    TEXT NOT NULL,
  enviado     BOOLEAN NOT NULL DEFAULT false,
  enviado_em  TIMESTAMPTZ,
  erro        TEXT,  -- mensagem de erro se falhou
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- FUNÇÕES AUXILIARES
-- =============================================================================

-- Função helper: retorna tenant_id do contexto atual (usada nas policies RLS)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$;

COMMENT ON FUNCTION get_current_tenant_id() IS 'Retorna tenant_id do contexto da requisição. Setado via: SET LOCAL app.current_tenant_id = ''<uuid>''.';

-- Função: atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Função: valida que total do pedido = subtotal + frete - desconto
CREATE OR REPLACE FUNCTION validate_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.total != (NEW.subtotal + NEW.frete - NEW.desconto) THEN
    RAISE EXCEPTION 'order total inválido: total(%) != subtotal(%) + frete(%) - desconto(%)',
      NEW.total, NEW.subtotal, NEW.frete, NEW.desconto;
  END IF;
  RETURN NEW;
END;
$$;

-- Função: registra timestamps de transição de status do pedido
CREATE OR REPLACE FUNCTION record_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'payment_confirmed' THEN NEW.pago_em = now();
      WHEN 'preparing'         THEN NEW.preparando_em = now();
      WHEN 'ready_for_pickup'  THEN NEW.pronto_em = now();
      WHEN 'out_for_delivery'  THEN NEW.saiu_em = now();
      WHEN 'delivered'         THEN NEW.entregue_em = now();
      WHEN 'cancelled'         THEN NEW.cancelado_em = now();
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

CREATE TRIGGER trg_tenants_atualizado_em
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_tenant_users_atualizado_em
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_product_categories_atualizado_em
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_products_atualizado_em
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_orders_atualizado_em
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE TRIGGER trg_orders_validate_total
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION validate_order_total();

CREATE TRIGGER trg_orders_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION record_order_status_transition();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Habilitar RLS em todas as tabelas multi-tenant
ALTER TABLE tenant_users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories   ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- NOTA: tenants NÃO tem RLS — é resolvido via service_role no middleware

-- -------------------------
-- Policies: tenant_users
-- -------------------------
CREATE POLICY "tenant_users: isolamento por tenant"
  ON tenant_users
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "tenant_users: cliente vê só a si mesmo"
  ON tenant_users
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      -- service_role vê tudo (para operações admin)
      current_setting('role', true) = 'service_role'
      -- cliente autenticado vê só seu próprio registro
      OR id::TEXT = current_setting('app.current_user_id', true)
    )
  );

-- -------------------------
-- Policies: product_categories
-- -------------------------
CREATE POLICY "product_categories: leitura pública por tenant"
  ON product_categories
  FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND ativo = true);

CREATE POLICY "product_categories: escrita apenas service_role"
  ON product_categories
  FOR ALL
  USING (
    tenant_id = get_current_tenant_id()
    AND current_setting('role', true) = 'service_role'
  );

-- -------------------------
-- Policies: products
-- -------------------------
CREATE POLICY "products: leitura pública por tenant"
  ON products
  FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND disponivel = true);

CREATE POLICY "products: escrita apenas service_role"
  ON products
  FOR ALL
  USING (
    tenant_id = get_current_tenant_id()
    AND current_setting('role', true) = 'service_role'
  );

-- -------------------------
-- Policies: orders
-- -------------------------
CREATE POLICY "orders: isolamento por tenant"
  ON orders
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

CREATE POLICY "orders: cliente vê apenas seus pedidos"
  ON orders
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      current_setting('role', true) = 'service_role'
      OR user_id::TEXT = current_setting('app.current_user_id', true)
    )
  );

CREATE POLICY "orders: cliente cria pedidos no próprio tenant"
  ON orders
  FOR INSERT
  WITH CHECK (
    tenant_id = get_current_tenant_id()
    AND user_id::TEXT = current_setting('app.current_user_id', true)
  );

-- -------------------------
-- Policies: order_items
-- -------------------------
CREATE POLICY "order_items: isolamento por tenant"
  ON order_items
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- -------------------------
-- Policies: notifications
-- -------------------------
CREATE POLICY "notifications: isolamento por tenant"
  ON notifications
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- =============================================================================
-- ÍNDICES
-- =============================================================================

-- tenants: resolução de subdomínio (hot path — toda requisição)
CREATE UNIQUE INDEX idx_tenants_slug        ON tenants(slug);
CREATE UNIQUE INDEX idx_tenants_custom_domain ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;
CREATE INDEX        idx_tenants_ativo       ON tenants(ativo) WHERE ativo = true;

-- tenant_users
CREATE UNIQUE INDEX idx_tenant_users_email  ON tenant_users(tenant_id, email);
CREATE INDEX        idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX        idx_tenant_users_auth   ON tenant_users(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- product_categories
CREATE INDEX idx_product_categories_tenant ON product_categories(tenant_id, ordem) WHERE ativo = true;

-- products: hot path — busca de cardápio
CREATE INDEX idx_products_tenant_cat       ON products(tenant_id, categoria_id, ordem) WHERE disponivel = true;
CREATE INDEX idx_products_tenant_disp      ON products(tenant_id, disponivel);

-- Busca full-text em produtos (nome + descrição)
-- Wrapper IMMUTABLE necessário para unaccent em expressões de índice
CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text LANGUAGE sql IMMUTABLE RETURNS NULL ON NULL INPUT AS $$
  SELECT unaccent($1);
$$;

CREATE INDEX idx_products_search           ON products
  USING GIN (to_tsvector('portuguese', immutable_unaccent(nome) || ' ' || COALESCE(immutable_unaccent(descricao), '')));

-- orders: hot paths
CREATE INDEX idx_orders_tenant             ON orders(tenant_id, criado_em DESC);
CREATE INDEX idx_orders_user               ON orders(tenant_id, user_id, criado_em DESC);
CREATE INDEX idx_orders_status             ON orders(tenant_id, status) WHERE status NOT IN ('delivered', 'cancelled');
CREATE INDEX idx_orders_pagamento_externo  ON orders(pagamento_id_externo) WHERE pagamento_id_externo IS NOT NULL;

-- order_items
CREATE INDEX idx_order_items_order         ON order_items(order_id);
CREATE INDEX idx_order_items_tenant        ON order_items(tenant_id);

-- notifications
CREATE INDEX idx_notifications_user_order  ON notifications(tenant_id, user_id, order_id);
CREATE INDEX idx_notifications_enviado     ON notifications(enviado, criado_em) WHERE enviado = false;

-- =============================================================================
-- SEED: TENANTS DE TESTE (para desenvolvimento local)
-- =============================================================================
-- ATENÇÃO: executar APENAS em ambiente local/staging, nunca em produção

-- INSERT INTO tenants (slug, nome, cor_primaria) VALUES
--   ('restaurante-a', 'Restaurante A — Teste', '#FF6B35'),
--   ('restaurante-b', 'Restaurante B — Teste', '#2D6A4F');
