'use client'

// AC3: card de produto com foto, nome, descrição truncada, preço e click para modal
import type { Produto } from '@/lib/catalog/types'

interface ProductCardProps {
  produto: Produto
  onClick: (produto: Produto) => void
}

export function ProductCard({ produto, onClick }: ProductCardProps) {
  const precoFormatado = produto.preco.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })

  return (
    <button
      type="button"
      onClick={() => onClick(produto)}
      className="w-full text-left bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-[--color-primary]"
    >
      {/* Foto do produto */}
      <div className="h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        {produto.foto_url ? (
          <img
            src={produto.foto_url}
            alt={produto.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl text-gray-300">🍽️</span>
        )}
      </div>

      {/* Informações */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight mb-1">
          {produto.nome}
        </h3>
        {produto.descricao && (
          <p className="text-gray-500 text-xs leading-snug line-clamp-2 mb-2">
            {produto.descricao}
          </p>
        )}
        <p className="font-bold text-[--color-primary] text-sm">{precoFormatado}</p>
      </div>
    </button>
  )
}
