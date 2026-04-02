// lib/catalog/types.ts
// Contrato de API do Catálogo — consumido por Story 2.3 (UI) e Epic 3 (Pedido)

export interface OpcaoCustomizacao {
  nome: string
  preco_adicional: number
}

export interface GrupoCustomizacao {
  nome: string
  tipo: 'choice' | 'addon'
  obrigatorio: boolean
  opcoes: OpcaoCustomizacao[]
}

export interface Categoria {
  id: string
  nome: string
  descricao: string | null
  imagem_url: string | null
  ordem: number
}

export interface Produto {
  id: string
  categoria_id: string
  nome: string
  descricao: string | null
  preco: number
  foto_url: string | null
  ordem: number
  customizacoes: GrupoCustomizacao[]
}
