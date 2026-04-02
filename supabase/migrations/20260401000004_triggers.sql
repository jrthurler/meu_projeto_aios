-- =============================================================================
-- Migration 004 — Triggers
-- Story: 1.1 — Infraestrutura Multi-Tenant e Banco de Dados
-- Depende de: 002 (funções) e 003 (tabelas)
-- =============================================================================

-- UP

-- atualizado_em automático
CREATE OR REPLACE TRIGGER trg_tenants_atualizado_em
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_tenant_users_atualizado_em
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_product_categories_atualizado_em
  BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_products_atualizado_em
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

CREATE OR REPLACE TRIGGER trg_orders_atualizado_em
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Validação de total do pedido
CREATE OR REPLACE TRIGGER trg_orders_validate_total
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION validate_order_total();

-- Timestamps de transição de status
CREATE OR REPLACE TRIGGER trg_orders_status_transition
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION record_order_status_transition();

-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_orders_status_transition ON orders;
-- DROP TRIGGER IF EXISTS trg_orders_validate_total ON orders;
-- DROP TRIGGER IF EXISTS trg_orders_atualizado_em ON orders;
-- DROP TRIGGER IF EXISTS trg_products_atualizado_em ON products;
-- DROP TRIGGER IF EXISTS trg_product_categories_atualizado_em ON product_categories;
-- DROP TRIGGER IF EXISTS trg_tenant_users_atualizado_em ON tenant_users;
-- DROP TRIGGER IF EXISTS trg_tenants_atualizado_em ON tenants;
