'use client'

// lib/cart/store.ts
// AC6: Zustand cart store — pronto para Epic 3 (Checkout)

import { create } from 'zustand'
import type { CartItem, OpcaoSelecionada } from './types'

interface AddItemPayload {
  produto_id: string
  nome: string
  preco_unitario: number
  quantidade: number
  customizacoes_selecionadas: OpcaoSelecionada[]
  foto_url: string | null
}

interface CartState {
  items: CartItem[]
  tenantSlug: string | null

  // Computed
  total: number
  itemCount: number

  // Actions
  addItem: (payload: AddItemPayload) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantidade: number) => void
  clearCart: () => void
  setTenantSlug: (slug: string) => void
}

function calcItemTotal(precoUnitario: number, customizacoes: OpcaoSelecionada[], quantidade: number): number {
  const adicionais = customizacoes.reduce((acc, op) => acc + op.preco_adicional, 0)
  return (precoUnitario + adicionais) * quantidade
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tenantSlug: null,
  total: 0,
  itemCount: 0,

  addItem: (payload) => {
    const preco_total = calcItemTotal(
      payload.preco_unitario,
      payload.customizacoes_selecionadas,
      payload.quantidade
    )

    const newItem: CartItem = {
      id: crypto.randomUUID(),
      produto_id: payload.produto_id,
      nome: payload.nome,
      preco_unitario: payload.preco_unitario,
      quantidade: payload.quantidade,
      customizacoes_selecionadas: payload.customizacoes_selecionadas,
      preco_total,
      foto_url: payload.foto_url,
    }

    set((state) => {
      const items = [...state.items, newItem]
      return {
        items,
        total: items.reduce((acc, i) => acc + i.preco_total, 0),
        itemCount: items.reduce((acc, i) => acc + i.quantidade, 0),
      }
    })
  },

  removeItem: (itemId) => {
    set((state) => {
      const items = state.items.filter((i) => i.id !== itemId)
      return {
        items,
        total: items.reduce((acc, i) => acc + i.preco_total, 0),
        itemCount: items.reduce((acc, i) => acc + i.quantidade, 0),
      }
    })
  },

  updateQuantity: (itemId, quantidade) => {
    if (quantidade <= 0) {
      get().removeItem(itemId)
      return
    }

    set((state) => {
      const items = state.items.map((item) => {
        if (item.id !== itemId) return item
        const preco_total = calcItemTotal(
          item.preco_unitario,
          item.customizacoes_selecionadas,
          quantidade
        )
        return { ...item, quantidade, preco_total }
      })
      return {
        items,
        total: items.reduce((acc, i) => acc + i.preco_total, 0),
        itemCount: items.reduce((acc, i) => acc + i.quantidade, 0),
      }
    })
  },

  clearCart: () => set({ items: [], total: 0, itemCount: 0 }),

  // AC6: reseta o carrinho ao trocar de tenant
  setTenantSlug: (slug) => {
    const current = get().tenantSlug
    if (current && current !== slug) {
      set({ items: [], total: 0, itemCount: 0, tenantSlug: slug })
    } else {
      set({ tenantSlug: slug })
    }
  },
}))
