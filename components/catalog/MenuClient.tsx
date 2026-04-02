'use client'

// MenuClient — Client Component que gerencia estado local de filtros e modal
import { useState, useMemo } from 'react'
import type { Categoria, Produto } from '@/lib/catalog/types'
import { CategoryNav } from './CategoryNav'
import { SearchBar } from './SearchBar'
import { ProductCard } from './ProductCard'
import { ProductModal } from './ProductModal'

interface MenuClientProps {
  categorias: Categoria[]
  produtos: Produto[]
}

export function MenuClient({ categorias, produtos }: MenuClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)

  // AC4: filtro local (client-side) sem nova requisição
  const produtosFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return produtos
    const lower = searchQuery.toLowerCase()
    return produtos.filter((p) => p.nome.toLowerCase().includes(lower))
  }, [produtos, searchQuery])

  // Agrupa produtos por categoria
  const produtosPorCategoria = useMemo(() => {
    return categorias.map((cat) => ({
      categoria: cat,
      produtos: produtosFiltrados.filter((p) => p.categoria_id === cat.id),
    }))
  }, [categorias, produtosFiltrados])

  const totalProdutos = produtosFiltrados.length

  return (
    <>
      {/* AC2: Navegação por categoria (sticky) */}
      <CategoryNav categorias={categorias} />

      {/* Barra de busca */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-2">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* Resultado da busca */}
      {searchQuery && (
        <p className="text-center text-sm text-gray-500 pb-2">
          {totalProdutos === 0
            ? `Nenhum resultado para "${searchQuery}"`
            : `${totalProdutos} resultado${totalProdutos !== 1 ? 's' : ''} para "${searchQuery}"`}
        </p>
      )}

      {/* AC1: seções por categoria */}
      <main className="max-w-2xl mx-auto px-4 pb-24">
        {totalProdutos === 0 && !searchQuery ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="text-sm">Cardápio em breve!</p>
          </div>
        ) : (
          produtosPorCategoria
            .filter((group) => group.produtos.length > 0)
            .map(({ categoria, produtos: prods }) => (
              <section
                key={categoria.id}
                id={`categoria-${categoria.id}`}
                className="pt-6 scroll-mt-14"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-3">{categoria.nome}</h2>
                {categoria.descricao && (
                  <p className="text-sm text-gray-500 mb-3 -mt-1">{categoria.descricao}</p>
                )}
                {/* AC3: grid de cards responsivo */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {prods.map((produto) => (
                    <ProductCard
                      key={produto.id}
                      produto={produto}
                      onClick={setProdutoSelecionado}
                    />
                  ))}
                </div>
              </section>
            ))
        )}
      </main>

      {/* AC5: modal de produto */}
      <ProductModal
        produto={produtoSelecionado}
        onClose={() => setProdutoSelecionado(null)}
      />
    </>
  )
}
