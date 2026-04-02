import { describe, it, expect, beforeEach } from 'vitest'
import { useCartStore } from '../../lib/cart/store'

// Reset store between tests
beforeEach(() => {
  useCartStore.getState().clearCart()
  useCartStore.setState({ tenantSlug: null })
})

// ──────────────────────────────────────────────
// AC6 — CartStore: addItem
// ──────────────────────────────────────────────

describe('CartStore — addItem', () => {
  it('AC6 — adiciona item sem customizações', () => {
    useCartStore.getState().addItem({
      produto_id: 'prod-1',
      nome: 'Pizza Margherita',
      preco_unitario: 45.90,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })

    const { items, total, itemCount } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].nome).toBe('Pizza Margherita')
    expect(items[0].preco_total).toBe(45.90)
    expect(total).toBe(45.90)
    expect(itemCount).toBe(1)
  })

  it('AC6 — preço total inclui adicionais × quantidade', () => {
    useCartStore.getState().addItem({
      produto_id: 'prod-2',
      nome: 'X-Burguer',
      preco_unitario: 32.00,
      quantidade: 2,
      customizacoes_selecionadas: [
        { grupo: 'Adicionais', opcao: 'Bacon', preco_adicional: 5.00 },
        { grupo: 'Adicionais', opcao: 'Ovo', preco_adicional: 3.00 },
      ],
      foto_url: null,
    })

    const { items, total } = useCartStore.getState()
    // (32 + 5 + 3) × 2 = 80
    expect(items[0].preco_total).toBe(80.00)
    expect(total).toBe(80.00)
  })

  it('AC6 — múltiplos itens acumulam total', () => {
    useCartStore.getState().addItem({
      produto_id: 'prod-1',
      nome: 'Pizza',
      preco_unitario: 45.90,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })
    useCartStore.getState().addItem({
      produto_id: 'prod-2',
      nome: 'Coca-Cola',
      preco_unitario: 6.00,
      quantidade: 2,
      customizacoes_selecionadas: [],
      foto_url: null,
    })

    const { items, total, itemCount } = useCartStore.getState()
    expect(items).toHaveLength(2)
    expect(total).toBeCloseTo(45.90 + 12.00)
    expect(itemCount).toBe(3) // 1 + 2
  })

  it('AC6 — cada addItem gera id único', () => {
    useCartStore.getState().addItem({
      produto_id: 'prod-1',
      nome: 'Pizza',
      preco_unitario: 45.90,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })
    useCartStore.getState().addItem({
      produto_id: 'prod-1',
      nome: 'Pizza',
      preco_unitario: 45.90,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })

    const { items } = useCartStore.getState()
    expect(items).toHaveLength(2)
    expect(items[0].id).not.toBe(items[1].id)
  })
})

// ──────────────────────────────────────────────
// AC6 — CartStore: removeItem
// ──────────────────────────────────────────────

describe('CartStore — removeItem', () => {
  it('AC6 — remove item pelo id e recalcula total', () => {
    useCartStore.getState().addItem({
      produto_id: 'p1',
      nome: 'Pizza',
      preco_unitario: 45.90,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })
    useCartStore.getState().addItem({
      produto_id: 'p2',
      nome: 'Coca',
      preco_unitario: 6.00,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })

    const { items: itemsAntes } = useCartStore.getState()
    const idPizza = itemsAntes[0].id
    useCartStore.getState().removeItem(idPizza)

    const { items, total, itemCount } = useCartStore.getState()
    expect(items).toHaveLength(1)
    expect(items[0].nome).toBe('Coca')
    expect(total).toBe(6.00)
    expect(itemCount).toBe(1)
  })
})

// ──────────────────────────────────────────────
// AC6 — CartStore: updateQuantity
// ──────────────────────────────────────────────

describe('CartStore — updateQuantity', () => {
  it('AC6 — atualiza quantidade e recalcula preco_total', () => {
    useCartStore.getState().addItem({
      produto_id: 'p1',
      nome: 'Batata Frita',
      preco_unitario: 16.00,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })

    const { items: antes } = useCartStore.getState()
    useCartStore.getState().updateQuantity(antes[0].id, 3)

    const { items, total, itemCount } = useCartStore.getState()
    expect(items[0].quantidade).toBe(3)
    expect(items[0].preco_total).toBe(48.00)
    expect(total).toBe(48.00)
    expect(itemCount).toBe(3)
  })

  it('AC6 — updateQuantity com 0 remove o item', () => {
    useCartStore.getState().addItem({
      produto_id: 'p1',
      nome: 'Item',
      preco_unitario: 10,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })

    const { items: antes } = useCartStore.getState()
    useCartStore.getState().updateQuantity(antes[0].id, 0)

    expect(useCartStore.getState().items).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────
// AC6 — CartStore: clearCart
// ──────────────────────────────────────────────

describe('CartStore — clearCart', () => {
  it('AC6 — clearCart zera itens, total e itemCount', () => {
    useCartStore.getState().addItem({
      produto_id: 'p1',
      nome: 'Pizza',
      preco_unitario: 45.90,
      quantidade: 2,
      customizacoes_selecionadas: [],
      foto_url: null,
    })

    useCartStore.getState().clearCart()

    const { items, total, itemCount } = useCartStore.getState()
    expect(items).toHaveLength(0)
    expect(total).toBe(0)
    expect(itemCount).toBe(0)
  })
})

// ──────────────────────────────────────────────
// AC6 — CartStore: isolamento por tenant
// ──────────────────────────────────────────────

describe('CartStore — isolamento por tenant', () => {
  it('AC6 — troca de tenant limpa o carrinho', () => {
    useCartStore.getState().setTenantSlug('restaurante-a')
    useCartStore.getState().addItem({
      produto_id: 'p1',
      nome: 'Pizza',
      preco_unitario: 45.90,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })

    expect(useCartStore.getState().items).toHaveLength(1)

    // Troca para outro tenant — deve limpar carrinho
    useCartStore.getState().setTenantSlug('restaurante-b')

    expect(useCartStore.getState().items).toHaveLength(0)
    expect(useCartStore.getState().total).toBe(0)
    expect(useCartStore.getState().tenantSlug).toBe('restaurante-b')
  })

  it('AC6 — mesmo tenant não limpa o carrinho', () => {
    useCartStore.getState().setTenantSlug('restaurante-a')
    useCartStore.getState().addItem({
      produto_id: 'p1',
      nome: 'Pizza',
      preco_unitario: 45.90,
      quantidade: 1,
      customizacoes_selecionadas: [],
      foto_url: null,
    })

    useCartStore.getState().setTenantSlug('restaurante-a') // mesmo slug

    expect(useCartStore.getState().items).toHaveLength(1)
  })
})
