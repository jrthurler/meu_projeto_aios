// lib/cart/types.ts
// Contrato do carrinho — consumido por Epic 3 (Pedido e Checkout)

export interface OpcaoSelecionada {
  grupo: string
  opcao: string
  preco_adicional: number
}

export interface CartItem {
  id: string           // UUID único do item no carrinho (não o produto_id)
  produto_id: string
  nome: string
  preco_unitario: number
  quantidade: number
  customizacoes_selecionadas: OpcaoSelecionada[]
  preco_total: number  // (preco_unitario + soma de adicionais) × quantidade
  foto_url: string | null
}
