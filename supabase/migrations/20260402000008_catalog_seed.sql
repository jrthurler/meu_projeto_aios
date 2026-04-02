-- =============================================================================
-- Migration 008 — Seed Data do Catálogo (Epic 2)
-- Story: 2.1 — Seed Data do Catálogo
-- Depende de: 003 (product_categories, products), 005 (RLS)
-- Propósito: Dados de teste para desenvolvimento de Story 2.2 (API) e 2.3 (UI)
-- =============================================================================

-- UP

DO $$
DECLARE
  tenant_a_id UUID;
  tenant_b_id UUID;

  -- Restaurante A (pizzaria) — categorias
  cat_a_pizzas       UUID;
  cat_a_bebidas      UUID;
  cat_a_sobremesas   UUID;

  -- Restaurante B (hamburgueria) — categorias
  cat_b_lanches      UUID;
  cat_b_acompanham   UUID;
  cat_b_bebidas      UUID;

BEGIN

  -- Buscar IDs dos tenants de teste
  SELECT id INTO tenant_a_id FROM tenants WHERE slug = 'restaurante-a';
  SELECT id INTO tenant_b_id FROM tenants WHERE slug = 'restaurante-b';

  -- Verificar se os tenants existem
  IF tenant_a_id IS NULL THEN
    RAISE NOTICE 'Tenant restaurante-a não encontrado — seed ignorado para tenant A';
  END IF;

  IF tenant_b_id IS NULL THEN
    RAISE NOTICE 'Tenant restaurante-b não encontrado — seed ignorado para tenant B';
  END IF;

  -- =========================================================================
  -- RESTAURANTE A — Pizzaria Bella Napoli
  -- =========================================================================

  IF tenant_a_id IS NOT NULL THEN

    -- Categorias
    INSERT INTO product_categories (tenant_id, nome, descricao, ordem, ativo)
    VALUES (tenant_a_id, 'Pizzas', 'Pizzas artesanais assadas em forno a lenha', 1, true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO cat_a_pizzas;

    IF cat_a_pizzas IS NULL THEN
      SELECT id INTO cat_a_pizzas FROM product_categories
      WHERE tenant_id = tenant_a_id AND nome = 'Pizzas';
    END IF;

    INSERT INTO product_categories (tenant_id, nome, descricao, ordem, ativo)
    VALUES (tenant_a_id, 'Bebidas', 'Refrigerantes, sucos e água', 2, true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO cat_a_bebidas;

    IF cat_a_bebidas IS NULL THEN
      SELECT id INTO cat_a_bebidas FROM product_categories
      WHERE tenant_id = tenant_a_id AND nome = 'Bebidas';
    END IF;

    INSERT INTO product_categories (tenant_id, nome, descricao, ordem, ativo)
    VALUES (tenant_a_id, 'Sobremesas', 'Doces e sobremesas artesanais', 3, true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO cat_a_sobremesas;

    IF cat_a_sobremesas IS NULL THEN
      SELECT id INTO cat_a_sobremesas FROM product_categories
      WHERE tenant_id = tenant_a_id AND nome = 'Sobremesas';
    END IF;

    -- Produtos — Pizzas
    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_a_id, cat_a_pizzas,
      'Pizza Margherita',
      'Molho de tomate artesanal, mozzarella de búfala, manjericão fresco e azeite extra virgem.',
      45.90, true, 1,
      '[
        {
          "nome": "Tamanho",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Pequena (4 fatias)", "preco_adicional": 0},
            {"nome": "Média (6 fatias)", "preco_adicional": 15.00},
            {"nome": "Grande (8 fatias)", "preco_adicional": 25.00}
          ]
        },
        {
          "nome": "Borda Recheada",
          "tipo": "choice",
          "obrigatorio": false,
          "opcoes": [
            {"nome": "Sem borda", "preco_adicional": 0},
            {"nome": "Borda de Catupiry", "preco_adicional": 8.00},
            {"nome": "Borda de Cheddar", "preco_adicional": 8.00}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_a_id, cat_a_pizzas,
      'Pizza Calabresa',
      'Molho de tomate, mozzarella, calabresa fatiada, cebola e azeitonas pretas.',
      49.90, true, 2,
      '[
        {
          "nome": "Tamanho",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Pequena (4 fatias)", "preco_adicional": 0},
            {"nome": "Média (6 fatias)", "preco_adicional": 15.00},
            {"nome": "Grande (8 fatias)", "preco_adicional": 25.00}
          ]
        },
        {
          "nome": "Borda Recheada",
          "tipo": "choice",
          "obrigatorio": false,
          "opcoes": [
            {"nome": "Sem borda", "preco_adicional": 0},
            {"nome": "Borda de Catupiry", "preco_adicional": 8.00},
            {"nome": "Borda de Cheddar", "preco_adicional": 8.00}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_a_id, cat_a_pizzas,
      'Pizza Frango com Catupiry',
      'Molho branco, mozzarella, frango desfiado temperado e catupiry cremoso.',
      52.90, true, 3,
      '[
        {
          "nome": "Tamanho",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Pequena (4 fatias)", "preco_adicional": 0},
            {"nome": "Média (6 fatias)", "preco_adicional": 15.00},
            {"nome": "Grande (8 fatias)", "preco_adicional": 25.00}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    -- Produtos — Bebidas (Restaurante A)
    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_a_id, cat_a_bebidas,
      'Coca-Cola', 'Lata 350ml gelada.', 6.00, true, 1, '[]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_a_id, cat_a_bebidas,
      'Suco Natural', 'Laranja, limão ou maracujá — 500ml.', 12.00, true, 2,
      '[
        {
          "nome": "Sabor",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Laranja", "preco_adicional": 0},
            {"nome": "Limão", "preco_adicional": 0},
            {"nome": "Maracujá", "preco_adicional": 0}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_a_id, cat_a_bebidas,
      'Água Mineral', 'Garrafa 500ml com ou sem gás.', 4.00, true, 3,
      '[
        {
          "nome": "Tipo",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Sem gás", "preco_adicional": 0},
            {"nome": "Com gás", "preco_adicional": 0}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    -- Produtos — Sobremesas (Restaurante A)
    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_a_id, cat_a_sobremesas,
      'Brownie de Chocolate',
      'Brownie artesanal com pedaços de chocolate meio amargo. Acompanha sorvete de creme.',
      18.00, true, 1, '[]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_a_id, cat_a_sobremesas,
      'Sorvete', 'Uma ou duas bolas de sorvete artesanal.', 12.00, true, 2,
      '[
        {
          "nome": "Sabor",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Chocolate", "preco_adicional": 0},
            {"nome": "Creme", "preco_adicional": 0},
            {"nome": "Morango", "preco_adicional": 0}
          ]
        },
        {
          "nome": "Quantidade de bolas",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "1 bola", "preco_adicional": 0},
            {"nome": "2 bolas", "preco_adicional": 6.00}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

  END IF;

  -- =========================================================================
  -- RESTAURANTE B — Hamburgaria Urban Burger
  -- =========================================================================

  IF tenant_b_id IS NOT NULL THEN

    -- Categorias
    INSERT INTO product_categories (tenant_id, nome, descricao, ordem, ativo)
    VALUES (tenant_b_id, 'Lanches', 'Hambúrgueres artesanais com blend especial', 1, true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO cat_b_lanches;

    IF cat_b_lanches IS NULL THEN
      SELECT id INTO cat_b_lanches FROM product_categories
      WHERE tenant_id = tenant_b_id AND nome = 'Lanches';
    END IF;

    INSERT INTO product_categories (tenant_id, nome, descricao, ordem, ativo)
    VALUES (tenant_b_id, 'Acompanhamentos', 'Batatas, anéis e molhos', 2, true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO cat_b_acompanham;

    IF cat_b_acompanham IS NULL THEN
      SELECT id INTO cat_b_acompanham FROM product_categories
      WHERE tenant_id = tenant_b_id AND nome = 'Acompanhamentos';
    END IF;

    INSERT INTO product_categories (tenant_id, nome, descricao, ordem, ativo)
    VALUES (tenant_b_id, 'Bebidas', 'Refrigerantes, shakes e sucos', 3, true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO cat_b_bebidas;

    IF cat_b_bebidas IS NULL THEN
      SELECT id INTO cat_b_bebidas FROM product_categories
      WHERE tenant_id = tenant_b_id AND nome = 'Bebidas';
    END IF;

    -- Produtos — Lanches
    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_b_id, cat_b_lanches,
      'X-Burguer Clássico',
      'Blend 160g, queijo cheddar, alface, tomate, picles e molho especial da casa.',
      32.00, true, 1,
      '[
        {
          "nome": "Ponto da Carne",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Ao Ponto", "preco_adicional": 0},
            {"nome": "Bem Passado", "preco_adicional": 0},
            {"nome": "Mal Passado", "preco_adicional": 0}
          ]
        },
        {
          "nome": "Adicionais",
          "tipo": "addon",
          "obrigatorio": false,
          "opcoes": [
            {"nome": "Bacon Crocante", "preco_adicional": 5.00},
            {"nome": "Ovo", "preco_adicional": 3.00},
            {"nome": "Queijo Extra", "preco_adicional": 3.00},
            {"nome": "Molho BBQ", "preco_adicional": 2.00}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_b_id, cat_b_lanches,
      'X-Bacon Double',
      'Dois blends 120g, double cheddar, bacon artesanal, cebola caramelizada e maionese de alho.',
      46.00, true, 2,
      '[
        {
          "nome": "Ponto da Carne",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Ao Ponto", "preco_adicional": 0},
            {"nome": "Bem Passado", "preco_adicional": 0}
          ]
        },
        {
          "nome": "Adicionais",
          "tipo": "addon",
          "obrigatorio": false,
          "opcoes": [
            {"nome": "Jalapeño", "preco_adicional": 2.00},
            {"nome": "Molho Barbecue Extra", "preco_adicional": 2.00},
            {"nome": "Onion Rings", "preco_adicional": 8.00}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_b_id, cat_b_lanches,
      'Veggie Burger',
      'Blend de grão-de-bico e beterraba, queijo vegano, alface, tomate e molho tahine.',
      34.00, true, 3,
      '[
        {
          "nome": "Adicionais",
          "tipo": "addon",
          "obrigatorio": false,
          "opcoes": [
            {"nome": "Abacate", "preco_adicional": 4.00},
            {"nome": "Queijo Vegano Extra", "preco_adicional": 3.00}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    -- Produtos — Acompanhamentos (Restaurante B)
    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_b_id, cat_b_acompanham,
      'Batata Frita',
      'Batatas fritas crocantes com sal e ervas.',
      16.00, true, 1,
      '[
        {
          "nome": "Tamanho",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Pequena", "preco_adicional": 0},
            {"nome": "Grande", "preco_adicional": 6.00}
          ]
        },
        {
          "nome": "Molho para Mergulhar",
          "tipo": "choice",
          "obrigatorio": false,
          "opcoes": [
            {"nome": "Sem molho", "preco_adicional": 0},
            {"nome": "Ketchup", "preco_adicional": 0},
            {"nome": "Maionese de Alho", "preco_adicional": 2.00},
            {"nome": "Cheddar Líquido", "preco_adicional": 3.00}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_b_id, cat_b_acompanham,
      'Onion Rings',
      'Anéis de cebola empanados e crocantes.',
      18.00, true, 2, '[]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_b_id, cat_b_acompanham,
      'Porção de Nuggets',
      '8 unidades de nuggets de frango crocante.',
      22.00, true, 3, '[]'::JSONB
    ) ON CONFLICT DO NOTHING;

    -- Produtos — Bebidas (Restaurante B)
    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_b_id, cat_b_bebidas,
      'Refrigerante Lata', 'Coca-Cola, Guaraná ou Sprite — lata 350ml.', 7.00, true, 1,
      '[
        {
          "nome": "Sabor",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Coca-Cola", "preco_adicional": 0},
            {"nome": "Guaraná Antarctica", "preco_adicional": 0},
            {"nome": "Sprite", "preco_adicional": 0}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_b_id, cat_b_bebidas,
      'Shake Artesanal',
      'Shake cremoso feito na hora — 400ml.',
      22.00, true, 2,
      '[
        {
          "nome": "Sabor",
          "tipo": "choice",
          "obrigatorio": true,
          "opcoes": [
            {"nome": "Chocolate", "preco_adicional": 0},
            {"nome": "Morango", "preco_adicional": 0},
            {"nome": "Doce de Leite", "preco_adicional": 0},
            {"nome": "Oreo", "preco_adicional": 3.00}
          ]
        }
      ]'::JSONB
    ) ON CONFLICT DO NOTHING;

    INSERT INTO products (tenant_id, categoria_id, nome, descricao, preco, disponivel, ordem, customizacoes)
    VALUES (
      tenant_b_id, cat_b_bebidas,
      'Suco de Laranja', 'Laranja natural espremida na hora — 400ml.', 14.00, true, 3, '[]'::JSONB
    ) ON CONFLICT DO NOTHING;

  END IF;

END $$;

-- ROLLBACK
-- DELETE FROM products        WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('restaurante-a', 'restaurante-b'));
-- DELETE FROM product_categories WHERE tenant_id IN (SELECT id FROM tenants WHERE slug IN ('restaurante-a', 'restaurante-b'));
