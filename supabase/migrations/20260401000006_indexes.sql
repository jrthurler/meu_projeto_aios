-- =============================================================================
-- Migration 006 — Índices
-- Story: 1.1 — Infraestrutura Multi-Tenant e Banco de Dados
-- Depende de: 003 (tabelas)
-- NOTA: Em produção com dados existentes, usar CREATE INDEX CONCURRENTLY
-- =============================================================================

-- UP

-- tenants: hot path — toda requisição resolve via slug ou custom_domain
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug
  ON tenants(slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_custom_domain
  ON tenants(custom_domain) WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tenants_ativo
  ON tenants(ativo) WHERE ativo = true;

-- tenant_users
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_users_email
  ON tenant_users(tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant
  ON tenant_users(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_users_auth
  ON tenant_users(auth_user_id) WHERE auth_user_id IS NOT NULL;

-- product_categories
CREATE INDEX IF NOT EXISTS idx_product_categories_tenant
  ON product_categories(tenant_id, ordem) WHERE ativo = true;

-- products: hot path — busca de cardápio
CREATE INDEX IF NOT EXISTS idx_products_tenant_cat
  ON products(tenant_id, categoria_id, ordem) WHERE disponivel = true;

CREATE INDEX IF NOT EXISTS idx_products_tenant_disp
  ON products(tenant_id, disponivel);

-- Busca full-text em produtos (nome + descrição) com suporte a acentos
-- Busca full-text sem unaccent (MVP) — suporte a acentos via unaccent pode ser adicionado
-- habilitando a extensão no painel Supabase (Database > Extensions > unaccent)
CREATE INDEX IF NOT EXISTS idx_products_search
  ON products
  USING GIN (to_tsvector('portuguese', nome || ' ' || COALESCE(descricao, '')));

-- orders: hot paths
CREATE INDEX IF NOT EXISTS idx_orders_tenant
  ON orders(tenant_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user
  ON orders(tenant_id, user_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders(tenant_id, status) WHERE status NOT IN ('delivered', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_orders_pagamento_externo
  ON orders(pagamento_id_externo) WHERE pagamento_id_externo IS NOT NULL;

-- order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order
  ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_tenant
  ON order_items(tenant_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_order
  ON notifications(tenant_id, user_id, order_id);

CREATE INDEX IF NOT EXISTS idx_notifications_enviado
  ON notifications(enviado, criado_em) WHERE enviado = false;

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_notifications_enviado;
-- DROP INDEX IF EXISTS idx_notifications_user_order;
-- DROP INDEX IF EXISTS idx_order_items_tenant;
-- DROP INDEX IF EXISTS idx_order_items_order;
-- DROP INDEX IF EXISTS idx_orders_pagamento_externo;
-- DROP INDEX IF EXISTS idx_orders_status;
-- DROP INDEX IF EXISTS idx_orders_user;
-- DROP INDEX IF EXISTS idx_orders_tenant;
-- DROP INDEX IF EXISTS idx_products_search;
-- DROP INDEX IF EXISTS idx_products_tenant_disp;
-- DROP INDEX IF EXISTS idx_products_tenant_cat;
-- DROP INDEX IF EXISTS idx_product_categories_tenant;
-- DROP INDEX IF EXISTS idx_tenant_users_auth;
-- DROP INDEX IF EXISTS idx_tenant_users_tenant;
-- DROP INDEX IF EXISTS idx_tenant_users_email;
-- DROP INDEX IF EXISTS idx_tenants_ativo;
-- DROP INDEX IF EXISTS idx_tenants_custom_domain;
-- DROP INDEX IF EXISTS idx_tenants_slug;
