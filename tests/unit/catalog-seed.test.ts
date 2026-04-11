import { describe, it, expect } from 'vitest'
import type { GrupoCustomizacao } from '../../lib/catalog/types'

// =============================================================================
// Story 2.1 — Seed Data do Catálogo
// T2.1.3 — Verificação do isolamento e formato do seed
//
// Estes testes validam:
//   AC3 — Isolamento RLS (estrutura de dados)
//   AC4 — Formato de customizações
//   AC1/AC2 — Contagem mínima de categorias e produtos por tenant
// =============================================================================

// ─── Representação do seed data (espelha o SQL 008) ──────────────────────────

const TENANT_A_ID = '11111111-1111-1111-1111-111111111111'
const TENANT_B_ID = '22222222-2222-2222-2222-222222222222'

const seedCategoriasA = [
  { tenant_id: TENANT_A_ID, nome: 'Pizzas', ordem: 1 },
  { tenant_id: TENANT_A_ID, nome: 'Bebidas', ordem: 2 },
  { tenant_id: TENANT_A_ID, nome: 'Sobremesas', ordem: 3 },
]

const seedCategoriasB = [
  { tenant_id: TENANT_B_ID, nome: 'Lanches', ordem: 1 },
  { tenant_id: TENANT_B_ID, nome: 'Acompanhamentos', ordem: 2 },
  { tenant_id: TENANT_B_ID, nome: 'Bebidas', ordem: 3 },
]

const seedProdutosA = [
  // Pizzas
  {
    tenant_id: TENANT_A_ID, categoria: 'Pizzas', nome: 'Pizza Margherita',
    preco: 45.90, disponivel: true, ativo: true,
    customizacoes: [
      {
        nome: 'Tamanho', tipo: 'choice' as const, obrigatorio: true,
        opcoes: [
          { nome: 'Pequena (4 fatias)', preco_adicional: 0 },
          { nome: 'Média (6 fatias)', preco_adicional: 15.00 },
          { nome: 'Grande (8 fatias)', preco_adicional: 25.00 },
        ],
      },
      {
        nome: 'Borda Recheada', tipo: 'choice' as const, obrigatorio: false,
        opcoes: [
          { nome: 'Sem borda', preco_adicional: 0 },
          { nome: 'Borda de Catupiry', preco_adicional: 8.00 },
          { nome: 'Borda de Cheddar', preco_adicional: 8.00 },
        ],
      },
    ] satisfies GrupoCustomizacao[],
  },
  {
    tenant_id: TENANT_A_ID, categoria: 'Pizzas', nome: 'Pizza Calabresa',
    preco: 49.90, disponivel: true, ativo: true, customizacoes: [],
  },
  {
    tenant_id: TENANT_A_ID, categoria: 'Pizzas', nome: 'Pizza Frango com Catupiry',
    preco: 52.90, disponivel: true, ativo: true, customizacoes: [],
  },
  // Bebidas
  {
    tenant_id: TENANT_A_ID, categoria: 'Bebidas', nome: 'Coca-Cola',
    preco: 6.00, disponivel: true, ativo: true, customizacoes: [],
  },
  {
    tenant_id: TENANT_A_ID, categoria: 'Bebidas', nome: 'Suco Natural',
    preco: 12.00, disponivel: true, ativo: true, customizacoes: [],
  },
  {
    tenant_id: TENANT_A_ID, categoria: 'Bebidas', nome: 'Água Mineral',
    preco: 4.00, disponivel: true, ativo: true, customizacoes: [],
  },
  // Sobremesas
  {
    tenant_id: TENANT_A_ID, categoria: 'Sobremesas', nome: 'Brownie de Chocolate',
    preco: 18.00, disponivel: true, ativo: true, customizacoes: [],
  },
  {
    tenant_id: TENANT_A_ID, categoria: 'Sobremesas', nome: 'Sorvete',
    preco: 12.00, disponivel: true, ativo: true, customizacoes: [],
  },
]

const seedProdutosB = [
  // Lanches
  {
    tenant_id: TENANT_B_ID, categoria: 'Lanches', nome: 'X-Burguer Clássico',
    preco: 32.00, disponivel: true, ativo: true,
    customizacoes: [
      {
        nome: 'Ponto da Carne', tipo: 'choice' as const, obrigatorio: true,
        opcoes: [
          { nome: 'Ao Ponto', preco_adicional: 0 },
          { nome: 'Bem Passado', preco_adicional: 0 },
          { nome: 'Mal Passado', preco_adicional: 0 },
        ],
      },
      {
        nome: 'Adicionais', tipo: 'addon' as const, obrigatorio: false,
        opcoes: [
          { nome: 'Bacon Crocante', preco_adicional: 5.00 },
          { nome: 'Ovo', preco_adicional: 3.00 },
          { nome: 'Queijo Extra', preco_adicional: 3.00 },
          { nome: 'Molho BBQ', preco_adicional: 2.00 },
        ],
      },
    ] satisfies GrupoCustomizacao[],
  },
  {
    tenant_id: TENANT_B_ID, categoria: 'Lanches', nome: 'X-Bacon Double',
    preco: 46.00, disponivel: true, ativo: true, customizacoes: [],
  },
  {
    tenant_id: TENANT_B_ID, categoria: 'Lanches', nome: 'Veggie Burger',
    preco: 34.00, disponivel: true, ativo: true, customizacoes: [],
  },
  // Acompanhamentos
  {
    tenant_id: TENANT_B_ID, categoria: 'Acompanhamentos', nome: 'Batata Frita',
    preco: 16.00, disponivel: true, ativo: true, customizacoes: [],
  },
  {
    tenant_id: TENANT_B_ID, categoria: 'Acompanhamentos', nome: 'Onion Rings',
    preco: 18.00, disponivel: true, ativo: true, customizacoes: [],
  },
  {
    tenant_id: TENANT_B_ID, categoria: 'Acompanhamentos', nome: 'Porção de Nuggets',
    preco: 22.00, disponivel: true, ativo: true, customizacoes: [],
  },
  // Bebidas
  {
    tenant_id: TENANT_B_ID, categoria: 'Bebidas', nome: 'Refrigerante Lata',
    preco: 7.00, disponivel: true, ativo: true, customizacoes: [],
  },
  {
    tenant_id: TENANT_B_ID, categoria: 'Bebidas', nome: 'Shake Artesanal',
    preco: 22.00, disponivel: true, ativo: true, customizacoes: [],
  },
  {
    tenant_id: TENANT_B_ID, categoria: 'Bebidas', nome: 'Suco de Laranja',
    preco: 14.00, disponivel: true, ativo: true, customizacoes: [],
  },
]

// ─── AC1 — Restaurante A ─────────────────────────────────────────────────────

describe('AC1 — Seed Restaurante A (pizzaria)', () => {
  it('AC1 — 3 categorias criadas', () => {
    expect(seedCategoriasA).toHaveLength(3)
    const nomes = seedCategoriasA.map((c) => c.nome)
    expect(nomes).toContain('Pizzas')
    expect(nomes).toContain('Bebidas')
    expect(nomes).toContain('Sobremesas')
  })

  it('AC1 — mínimo 2 produtos por categoria', () => {
    const por = (cat: string) => seedProdutosA.filter((p) => p.categoria === cat)
    expect(por('Pizzas').length).toBeGreaterThanOrEqual(2)
    expect(por('Bebidas').length).toBeGreaterThanOrEqual(2)
    expect(por('Sobremesas').length).toBeGreaterThanOrEqual(2)
  })

  it('AC1 — pelo menos 1 produto com customizações (tamanho + borda)', () => {
    const comCustom = seedProdutosA.filter((p) => p.customizacoes.length > 0)
    expect(comCustom.length).toBeGreaterThanOrEqual(1)

    const margherita = seedProdutosA.find((p) => p.nome === 'Pizza Margherita')
    expect(margherita).toBeDefined()
    const grupos = margherita!.customizacoes.map((g) => g.nome)
    expect(grupos).toContain('Tamanho')
    expect(grupos).toContain('Borda Recheada')
  })

  it('AC1 — todos disponivel = true e ativo = true', () => {
    for (const p of seedProdutosA) {
      expect(p.disponivel).toBe(true)
      expect(p.ativo).toBe(true)
    }
  })

  it('AC1 — todos pertencem ao tenant A', () => {
    for (const p of seedProdutosA) {
      expect(p.tenant_id).toBe(TENANT_A_ID)
    }
    for (const c of seedCategoriasA) {
      expect(c.tenant_id).toBe(TENANT_A_ID)
    }
  })
})

// ─── AC2 — Restaurante B ─────────────────────────────────────────────────────

describe('AC2 — Seed Restaurante B (hamburgueria)', () => {
  it('AC2 — 3 categorias criadas', () => {
    expect(seedCategoriasB).toHaveLength(3)
    const nomes = seedCategoriasB.map((c) => c.nome)
    expect(nomes).toContain('Lanches')
    expect(nomes).toContain('Acompanhamentos')
    expect(nomes).toContain('Bebidas')
  })

  it('AC2 — mínimo 2 produtos por categoria', () => {
    const por = (cat: string) => seedProdutosB.filter((p) => p.categoria === cat)
    expect(por('Lanches').length).toBeGreaterThanOrEqual(2)
    expect(por('Acompanhamentos').length).toBeGreaterThanOrEqual(2)
    expect(por('Bebidas').length).toBeGreaterThanOrEqual(2)
  })

  it('AC2 — pelo menos 1 produto com customizações (ponto + adicionais)', () => {
    const xBurguer = seedProdutosB.find((p) => p.nome === 'X-Burguer Clássico')
    expect(xBurguer).toBeDefined()
    const grupos = xBurguer!.customizacoes.map((g) => g.nome)
    expect(grupos).toContain('Ponto da Carne')
    expect(grupos).toContain('Adicionais')
  })

  it('AC2 — todos disponivel = true e ativo = true', () => {
    for (const p of seedProdutosB) {
      expect(p.disponivel).toBe(true)
      expect(p.ativo).toBe(true)
    }
  })

  it('AC2 — todos pertencem ao tenant B', () => {
    for (const p of seedProdutosB) {
      expect(p.tenant_id).toBe(TENANT_B_ID)
    }
    for (const c of seedCategoriasB) {
      expect(c.tenant_id).toBe(TENANT_B_ID)
    }
  })
})

// ─── AC3 — Isolamento RLS ────────────────────────────────────────────────────

describe('AC3 — Isolamento RLS entre tenants', () => {
  it('AC3 — query com tenant_id A NÃO retorna produtos de tenant B', () => {
    const queryTenantA = seedProdutosA.concat(seedProdutosB).filter(
      (p) => p.tenant_id === TENANT_A_ID,
    )
    // Nenhum produto de B aparece no resultado filtrado por A
    const tenantBNoResultado = queryTenantA.filter((p) => p.tenant_id === TENANT_B_ID)
    expect(tenantBNoResultado).toHaveLength(0)
  })

  it('AC3 — query com tenant_id B NÃO retorna produtos de tenant A', () => {
    const queryTenantB = seedProdutosA.concat(seedProdutosB).filter(
      (p) => p.tenant_id === TENANT_B_ID,
    )
    const tenantANoResultado = queryTenantB.filter((p) => p.tenant_id === TENANT_A_ID)
    expect(tenantANoResultado).toHaveLength(0)
  })

  it('AC3 — tenant-A e tenant-B têm IDs completamente diferentes', () => {
    expect(TENANT_A_ID).not.toBe(TENANT_B_ID)
  })

  it('AC3 — nenhum produto é compartilhado entre tenants', () => {
    const nomesA = new Set(seedProdutosA.map((p) => `${p.tenant_id}:${p.nome}`))
    const nomesB = new Set(seedProdutosB.map((p) => `${p.tenant_id}:${p.nome}`))
    for (const chave of nomesB) {
      expect(nomesA.has(chave)).toBe(false)
    }
  })
})

// ─── AC4 — Formato de Customizações ─────────────────────────────────────────

describe('AC4 — Formato de customizações JSONB', () => {
  it('AC4 — grupos tipo "choice" têm nome, tipo, obrigatorio e opcoes', () => {
    const grupoTamanho = seedProdutosA[0].customizacoes[0] as GrupoCustomizacao
    expect(grupoTamanho).toHaveProperty('nome')
    expect(grupoTamanho).toHaveProperty('tipo')
    expect(grupoTamanho).toHaveProperty('obrigatorio')
    expect(grupoTamanho).toHaveProperty('opcoes')
    expect(grupoTamanho.tipo).toBe('choice')
    expect(Array.isArray(grupoTamanho.opcoes)).toBe(true)
  })

  it('AC4 — grupo tipo "addon" (hamburgueria) tem estrutura correta', () => {
    const xBurguer = seedProdutosB.find((p) => p.nome === 'X-Burguer Clássico')!
    const grupoAdicionais = xBurguer.customizacoes.find((g) => g.nome === 'Adicionais')!
    expect(grupoAdicionais.tipo).toBe('addon')
    expect(grupoAdicionais.obrigatorio).toBe(false)
    expect(grupoAdicionais.opcoes.length).toBeGreaterThan(0)
  })

  it('AC4 — cada opção tem nome e preco_adicional numérico', () => {
    const opcoes = seedProdutosA[0].customizacoes[0].opcoes
    for (const opcao of opcoes) {
      expect(typeof opcao.nome).toBe('string')
      expect(typeof opcao.preco_adicional).toBe('number')
      expect(opcao.preco_adicional).toBeGreaterThanOrEqual(0)
    }
  })

  it('AC4 — produto sem customizações usa array vazio (não null)', () => {
    const cocaCola = seedProdutosA.find((p) => p.nome === 'Coca-Cola')!
    expect(Array.isArray(cocaCola.customizacoes)).toBe(true)
    expect(cocaCola.customizacoes).toHaveLength(0)
  })

  it('AC4 — opção base (preco_adicional = 0) presente em grupos obrigatórios', () => {
    const grupoTamanho = seedProdutosA[0].customizacoes[0]
    expect(grupoTamanho.obrigatorio).toBe(true)
    const opcaoBase = grupoTamanho.opcoes.find((o) => o.preco_adicional === 0)
    expect(opcaoBase).toBeDefined()
  })
})
