-- =============================================================================
-- Migration 005 — Row-Level Security (RLS)
-- Story: 1.1 — Infraestrutura Multi-Tenant e Banco de Dados
-- Depende de: 002 (get_current_tenant_id) e 003 (tabelas)
-- RISCO: Alto — testar isolamento antes de habilitar em produção
-- =============================================================================

-- UP

-- Habilitar RLS em todas as tabelas multi-tenant
ALTER TABLE tenant_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;

-- NOTA: tenants NÃO tem RLS — é resolvido via service_role no middleware

-- -------------------------
-- Policies: tenant_users
-- -------------------------
DROP POLICY IF EXISTS "tenant_users: isolamento por tenant" ON tenant_users;
CREATE POLICY "tenant_users: isolamento por tenant"
  ON tenant_users
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "tenant_users: cliente vê só a si mesmo" ON tenant_users;
CREATE POLICY "tenant_users: cliente vê só a si mesmo"
  ON tenant_users
  FOR SELECT
  USING (
    tenant_id = get_current_tenant_id()
    AND (
      current_setting('role', true) = 'service_role'
      OR id::TEXT = current_setting('app.current_user_id', true)
    )
  );

-- -------------------------
-- Policies: product_categories
-- -------------------------
DROP POLICY IF EXISTS "product_categories: leitura pública por tenant" ON product_categories;
CREATE POLICY "product_categories: leitura pública por tenant"
  ON product_categories
  FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND ativo = true);

DROP POLICY IF EXISTS "product_categories: escrita apenas service_role" ON product_categories;
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
DROP POLICY IF EXISTS "products: leitura pública por tenant" ON products;
CREATE POLICY "products: leitura pública por tenant"
  ON products
  FOR SELECT
  USING (tenant_id = get_current_tenant_id() AND disponivel = true);

DROP POLICY IF EXISTS "products: escrita apenas service_role" ON products;
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
DROP POLICY IF EXISTS "orders: isolamento por tenant" ON orders;
CREATE POLICY "orders: isolamento por tenant"
  ON orders
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

DROP POLICY IF EXISTS "orders: cliente vê apenas seus pedidos" ON orders;
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

DROP POLICY IF EXISTS "orders: cliente cria pedidos no próprio tenant" ON orders;
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
DROP POLICY IF EXISTS "order_items: isolamento por tenant" ON order_items;
CREATE POLICY "order_items: isolamento por tenant"
  ON order_items
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- -------------------------
-- Policies: notifications
-- -------------------------
DROP POLICY IF EXISTS "notifications: isolamento por tenant" ON notifications;
CREATE POLICY "notifications: isolamento por tenant"
  ON notifications
  FOR ALL
  USING (tenant_id = get_current_tenant_id());

-- ROLLBACK
-- DROP POLICY IF EXISTS "notifications: isolamento por tenant" ON notifications;
-- DROP POLICY IF EXISTS "order_items: isolamento por tenant" ON order_items;
-- DROP POLICY IF EXISTS "orders: cliente cria pedidos no próprio tenant" ON orders;
-- DROP POLICY IF EXISTS "orders: cliente vê apenas seus pedidos" ON orders;
-- DROP POLICY IF EXISTS "orders: isolamento por tenant" ON orders;
-- DROP POLICY IF EXISTS "products: escrita apenas service_role" ON products;
-- DROP POLICY IF EXISTS "products: leitura pública por tenant" ON products;
-- DROP POLICY IF EXISTS "product_categories: escrita apenas service_role" ON product_categories;
-- DROP POLICY IF EXISTS "product_categories: leitura pública por tenant" ON product_categories;
-- DROP POLICY IF EXISTS "tenant_users: cliente vê só a si mesmo" ON tenant_users;
-- DROP POLICY IF EXISTS "tenant_users: isolamento por tenant" ON tenant_users;
-- ALTER TABLE notifications      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders             DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE products           DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE product_categories DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tenant_users       DISABLE ROW LEVEL SECURITY;
