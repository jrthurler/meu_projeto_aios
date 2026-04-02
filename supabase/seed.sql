-- =============================================================================
-- Seed: Tenants de Teste
-- Story: 1.1 — Infraestrutura Multi-Tenant e Banco de Dados (AC7)
-- ATENÇÃO: Executar APENAS em ambiente local/staging — NUNCA em produção
-- =============================================================================

-- Inserir tenants de teste com IDs fixos para facilitar testes de isolamento
INSERT INTO tenants (id, slug, nome, cor_primaria, cor_primaria_texto)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'restaurante-a',
    'Restaurante A — Teste',
    '#FF6B35',
    '#FFFFFF'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'restaurante-b',
    'Restaurante B — Teste',
    '#2D6A4F',
    '#FFFFFF'
  )
ON CONFLICT (slug) DO NOTHING;

-- Inserir uma categoria em cada tenant
INSERT INTO product_categories (id, tenant_id, nome, ordem)
VALUES
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Pratos Principais',
    1
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'Pratos Principais',
    1
  )
ON CONFLICT DO NOTHING;

-- Inserir um produto em cada tenant (para teste de isolamento AC7)
INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Produto Exclusivo A',
    'Este produto pertence SOMENTE ao restaurante-a',
    29.90
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Produto Exclusivo B',
    'Este produto pertence SOMENTE ao restaurante-b',
    34.90
  )
ON CONFLICT DO NOTHING;

-- =============================================================================
-- TESTE DE ISOLAMENTO (AC7) — executar manualmente para validar RLS
-- =============================================================================
--
-- BEGIN;
--
-- -- Contexto: restaurante-a
-- SET LOCAL app.current_tenant_id = '11111111-1111-1111-1111-111111111111';
-- SELECT nome FROM products;
-- -- Esperado: SOMENTE 'Produto Exclusivo A'
--
-- -- Contexto: restaurante-b
-- SET LOCAL app.current_tenant_id = '22222222-2222-2222-2222-222222222222';
-- SELECT nome FROM products;
-- -- Esperado: SOMENTE 'Produto Exclusivo B'
--
-- -- Sem contexto definido
-- SET LOCAL app.current_tenant_id = '';
-- SELECT count(*) FROM products;
-- -- Esperado: 0 (RLS bloqueia, sem lançar erro)
--
-- ROLLBACK;
