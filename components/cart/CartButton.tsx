'use client'

// AC7: botão do carrinho no header com badge de quantidade
import { useCartStore } from '@/lib/cart/store'

export function CartButton() {
  const itemCount = useCartStore((s) => s.itemCount)
  const total = useCartStore((s) => s.total)

  return (
    <button
      type="button"
      className="relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[--color-primary] text-[--color-primary-fg] text-sm font-medium hover:opacity-90 transition-opacity"
    >
      🛒
      <span className="hidden sm:inline">
        {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
      </span>
      {itemCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white text-[--color-primary] rounded-full text-xs font-bold flex items-center justify-center border border-[--color-primary]">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  )
}
