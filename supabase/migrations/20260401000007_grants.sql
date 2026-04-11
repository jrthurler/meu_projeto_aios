-- =============================================================================
-- Migration 007 — Grants de Acesso por Role
-- Story: 1.1 — Infraestrutura Multi-Tenant e Banco de Dados
-- Depende de: 003 (tabelas), 005 (RLS)
-- =============================================================================

-- UP
-- Roles no Supabase: anon (não autenticado), authenticated (logado), service_role (admin)
-- RLS só é aplicado para anon e authenticated — service_role bypassa RLS por design

-- Acesso de leitura pública (cardápio, config de tenant)
GRANT SELECT ON product_categories TO anon, authenticated;
GRANT SELECT ON products            TO anon, authenticated;

-- Acesso autenticado (pedidos e usuários — filtrados por RLS)
GRANT SELECT, INSERT, UPDATE ON orders        TO authenticated;
GRANT SELECT                  ON order_items  TO authenticated;
GRANT SELECT, INSERT, UPDATE  ON tenant_users TO authenticated;
GRANT SELECT, INSERT          ON notifications TO authenticated;

-- service_role acessa tudo via supabase_admin (bypass RLS por design)

-- ROLLBACK
-- REVOKE ALL ON notifications   FROM anon, authenticated;
-- REVOKE ALL ON tenant_users    FROM anon, authenticated;
-- REVOKE ALL ON order_items     FROM anon, authenticated;
-- REVOKE ALL ON orders          FROM anon, authenticated;
-- REVOKE ALL ON products        FROM anon, authenticated;
-- REVOKE ALL ON product_categories FROM anon, authenticated;
