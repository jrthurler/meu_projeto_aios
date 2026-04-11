-- ============================================================
-- AC7 — Teste de Isolamento RLS
-- Story: 1.1 — Infraestrutura Multi-Tenant e Banco de Dados
-- URL: https://supabase.com/dashboard/project/qyvivlojyriocvighxio/sql/new
--
-- IMPORTANTE: SET LOCAL ROLE authenticated é obrigatório.
-- O SQL Editor roda como postgres (superuser), que bypassa RLS por design.
-- Precisamos trocar para 'authenticated' para ativar as políticas RLS.
-- ============================================================

-- STEP 1: Seed de dados de teste (rodar uma vez)
INSERT INTO tenants (id, slug, nome, cor_primaria)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'restaurante-a', 'Restaurante A', '#FF6B35'),
  ('22222222-2222-2222-2222-222222222222', 'restaurante-b', 'Restaurante B', '#2D6A4F')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_categories (id, tenant_id, nome)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Principal A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'Principal B')
ON CONFLICT DO NOTHING;

INSERT INTO products (tenant_id, categoria_id, nome, preco)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Produto Exclusivo A', 29.90),
  ('22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Produto Exclusivo B', 34.90)
ON CONFLICT DO NOTHING;

-- ============================================================
-- STEP 2: Teste de isolamento (SET ROLE obrigatório para RLS)
-- ============================================================
BEGIN;

-- CRÍTICO: trocar para role authenticated (superuser bypassa RLS)
SET LOCAL ROLE authenticated;

-- TESTE 1: Contexto restaurante-a → deve retornar SÓ "Produto Exclusivo A"
SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
SELECT 'TESTE 1 — contexto A (esperado: 1 linha → Produto Exclusivo A)' AS descricao;
SELECT nome FROM products;

-- TESTE 2: Contexto restaurante-b → deve retornar SÓ "Produto Exclusivo B"
SET LOCAL app.current_tenant_id = '22222222-2222-2222-2222-222222222222';
SELECT 'TESTE 2 — contexto B (esperado: 1 linha → Produto Exclusivo B)' AS descricao;
SELECT nome FROM products;

-- TESTE 3: Sem contexto → deve retornar 0 registros
SET LOCAL app.current_tenant_id = '';
SELECT 'TESTE 3 — sem contexto (esperado: total = 0)' AS descricao;
SELECT count(*) AS total FROM products;

ROLLBACK;
