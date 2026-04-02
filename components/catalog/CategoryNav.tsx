'use client'

// AC2: navegação horizontal de categorias com scroll suave e categoria ativa destacada
import { useState } from 'react'
import type { Categoria } from '@/lib/catalog/types'

interface CategoryNavProps {
  categorias: Categoria[]
}

export function CategoryNav({ categorias }: CategoryNavProps) {
  const [activeId, setActiveId] = useState<string | null>(
    categorias[0]?.id ?? null
  )

  function handleClick(categoriaId: string) {
    setActiveId(categoriaId)
    const el = document.getElementById(`categoria-${categoriaId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (categorias.length === 0) return null

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-200 overflow-x-auto">
      <div className="flex gap-1 px-4 py-2 min-w-max">
        {categorias.map((cat) => {
          const isActive = cat.id === activeId
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleClick(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-[--color-primary] text-[--color-primary-fg]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.nome}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
