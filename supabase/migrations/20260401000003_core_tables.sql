-- =============================================================================
-- Migration 003 — Tabelas Core
-- Story: 1.1 — Infraestrutura Multi-Tenant e Banco de Dados
-- Ordem obrigatória (FK constraints): tenants → tenant_users → product_categories
--   → products → orders → order_items → notifications
-- =============================================================================

-- UP

-- ---------------------------------------------------------------------------
-- TABLE: tenants
-- Registro master de cada restaurante/tenant. SEM RLS — resolvido via
-- service_role no middleware.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  nome                TEXT NOT NULL,
  custom_domain       TEXT UNIQUE,
  plano               plano_saas NOT NULL DEFAULT 'starter',
  ativo               BOOLEAN NOT NULL DEFAULT true,

  -- Branding
  logo_url            TEXT,
  banner_url          TEXT,
  cor_primaria        TEXT NOT NULL DEFAULT '#FF6B35',
  cor_primaria_texto  TEXT NOT NULL DEFAULT '#FFFFFF',

  -- Configurações operacionais
  config              JSONB NOT NULL DEFAULT '{
    "frete_base": 5.00,
    "frete_gratis_acima": 50.00,
    "raio_entrega_km": 5,
    "tempo_preparo_min": 30,
    "aceita_agendamento": false
  }'::JSONB,

  -- Horários de funcionamento
  horarios            JSONB NOT NULL DEFAULT '{
    "segunda":  {"aberto": true,  "inicio": "11:00", "fim": "22:00"},
    "terca":    {"aberto": true,  "inicio": "11:00", "fim": "22:00"},
    "quarta":   {"aberto": true,  "inicio": "11:00", "fim": "22:00"},
    "quinta":   {"aberto": true,  "inicio": "11:00", "fim": "22:00"},
    "sexta":    {"aberto": true,  "inicio": "11:00", "fim": "23:00"},
    "sabado":   {"aberto": true,  "inicio": "11:00", "fim": "23:00"},
    "domingo":  {"aberto": true,  "inicio": "11:00", "fim": "21:00"}
  }'::JSONB,

  -- Integração de pagamento (NUNCA plaintext — hash/encrypt na aplicação)
  pagamento_config    JSONB,

  criado_em           TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em       TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE tenants IS
  'Registro master de cada restaurante/tenant. Sem RLS — resolvido via service_role na camada de middleware.';
COMMENT ON COLUMN tenants.config IS
  'Configurações operacionais: frete, raio de entrega, tempo de preparo.';
COMMENT ON COLUMN tenants.pagamento_config IS
  'Credenciais do gateway de pagamento. NUNCA armazenar em plaintext — hash/encrypt na aplicação.';

-- ---------------------------------------------------------------------------
-- TABLE: tenant_users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email             TEXT NOT NULL,
  nome              TEXT NOT NULL,
  telefone          TEXT,
  email_verificado  BOOLEAN NOT NULL DEFAULT false,
  ativo             BOOLEAN NOT NULL DEFAULT true,
  auth_user_id      UUID,
  enderecos         JSONB NOT NULL DEFAULT '[]'::JSONB,
  preferencias      JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em         TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, email)
);

COMMENT ON TABLE tenant_users IS
  'Clientes finais. Scoped por tenant_id. Um email pode existir em múltiplos tenants.';
COMMENT ON COLUMN tenant_users.enderecos IS
  'Array JSON: [{ "label": "Casa", "logradouro": "...", "numero": "...", "bairro": "...", "cidade": "...", "cep": "...", "complemento": "...", "lat": -23.5, "lng": -46.6 }]';

-- ---------------------------------------------------------------------------
-- TABLE: product_categories
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome          TEXT NOT NULL,
  descricao     TEXT,
  imagem_url    TEXT,
  ordem         INTEGER NOT NULL DEFAULT 0,
  ativo         BOOLEAN NOT NULL DEFAULT true,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- TABLE: products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  categoria_id    UUID NOT NULL REFERENCES product_categories(id) ON DELETE RESTRICT,
  nome            TEXT NOT NULL,
  descricao       TEXT,
  preco           NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
  foto_url        TEXT,
  disponivel      BOOLEAN NOT NULL DEFAULT true,
  ordem           INTEGER NOT NULL DEFAULT 0,
  customizacoes   JSONB NOT NULL DEFAULT '[]'::JSONB,
  metadados       JSONB NOT NULL DEFAULT '{}'::JSONB,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON COLUMN products.customizacoes IS
  'Array de grupos de customização. Ex: tamanho, adicionais, observação livre.';

-- ---------------------------------------------------------------------------
-- TABLE: orders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  user_id               UUID REFERENCES tenant_users(id) ON DELETE SET NULL,

  -- Valores financeiros (NUMERIC — nunca FLOAT)
  subtotal              NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
  frete                 NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (frete >= 0),
  desconto              NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (desconto >= 0),
  total                 NUMERIC(10, 2) NOT NULL CHECK (total >= 0),

  status                order_status NOT NULL DEFAULT 'pending_payment',

  -- Snapshot do endereço no momento do pedido
  endereco_entrega      JSONB NOT NULL,

  -- Pagamento
  metodo_pagamento      payment_method NOT NULL,
  pagamento_status      payment_status NOT NULL DEFAULT 'pending',
  pagamento_id_externo  TEXT,
  pagamento_qr_code     TEXT,

  -- Timestamps de transição de status
  pago_em               TIMESTAMPTZ,
  aceito_em             TIMESTAMPTZ,
  preparando_em         TIMESTAMPTZ,
  pronto_em             TIMESTAMPTZ,
  saiu_em               TIMESTAMPTZ,
  entregue_em           TIMESTAMPTZ,
  cancelado_em          TIMESTAMPTZ,
  motivo_cancelamento   TEXT,

  tempo_estimado_min    INTEGER,
  notas_cliente         TEXT,
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE orders IS
  'Pedidos realizados. Status controlado via order_status enum. Supabase Realtime monitora mudanças de status.';
COMMENT ON COLUMN orders.total IS
  'total = subtotal + frete - desconto. Calculado e validado na aplicação antes de inserir.';

-- ---------------------------------------------------------------------------
-- TABLE: order_items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  tenant_id                   UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  product_id                  UUID REFERENCES products(id) ON DELETE SET NULL,

  -- Snapshot (preserva histórico mesmo se produto mudar)
  produto_nome                TEXT NOT NULL,
  produto_foto_url            TEXT,
  preco_unitario              NUMERIC(10, 2) NOT NULL CHECK (preco_unitario >= 0),
  quantidade                  INTEGER NOT NULL CHECK (quantidade > 0),
  preco_total                 NUMERIC(10, 2) NOT NULL CHECK (preco_total >= 0),
  customizacoes_selecionadas  JSONB NOT NULL DEFAULT '[]'::JSONB,
  notas                       TEXT,
  criado_em                   TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE order_items IS
  'Itens do pedido com snapshot de preço e nome — preserva histórico mesmo se produto for alterado.';

-- ---------------------------------------------------------------------------
-- TABLE: notifications
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES tenant_users(id) ON DELETE SET NULL,
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  canal       notification_channel NOT NULL,
  titulo      TEXT,
  mensagem    TEXT NOT NULL,
  enviado     BOOLEAN NOT NULL DEFAULT false,
  enviado_em  TIMESTAMPTZ,
  erro        TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ROLLBACK (ordem inversa)
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS products;
-- DROP TABLE IF EXISTS product_categories;
-- DROP TABLE IF EXISTS tenant_users;
-- DROP TABLE IF EXISTS tenants;
