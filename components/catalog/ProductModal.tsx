'use client'

// AC5: modal de produto com customizações, seletor de quantidade e adicionar ao carrinho
import { useState, useEffect } from 'react'
import type { Produto, GrupoCustomizacao } from '@/lib/catalog/types'
import type { OpcaoSelecionada } from '@/lib/cart/types'
import { useCartStore } from '@/lib/cart/store'

interface ProductModalProps {
  produto: Produto | null
  onClose: () => void
}

export function ProductModal({ produto, onClose }: ProductModalProps) {
  const addItem = useCartStore((s) => s.addItem)
  const [quantidade, setQuantidade] = useState(1)
  const [selecoes, setSelecoes] = useState<Record<string, string>>({}) // grupo → opcao nome

  useEffect(() => {
    if (produto) {
      setQuantidade(1)
      setSelecoes({})
    }
  }, [produto])

  if (!produto) return null

  // Calcula preço total em tempo real
  const adicionais = produto.customizacoes.reduce((acc, grupo) => {
    const opcaoNome = selecoes[grupo.nome]
    if (!opcaoNome) return acc
    const opcao = grupo.opcoes.find((o) => o.nome === opcaoNome)
    return acc + (opcao?.preco_adicional ?? 0)
  }, 0)

  // Para addons (múltiplas seleções), precisa de lógica diferente — usando Set por grupo
  // Simplificação: addons como choice (single) para MVP; multi-select é Epic 6
  const precoTotal = (produto.preco + adicionais) * quantidade

  function handleSeleção(grupoNome: string, opcaoNome: string) {
    setSelecoes((prev) => ({ ...prev, [grupoNome]: opcaoNome }))
  }

  function handleAdicionarAoCarrinho() {
    const customizacoes_selecionadas: OpcaoSelecionada[] = produto.customizacoes
      .map((grupo) => {
        const opcaoNome = selecoes[grupo.nome]
        if (!opcaoNome) return null
        const opcao = grupo.opcoes.find((o) => o.nome === opcaoNome)
        if (!opcao) return null
        return {
          grupo: grupo.nome,
          opcao: opcaoNome,
          preco_adicional: opcao.preco_adicional,
        }
      })
      .filter(Boolean) as OpcaoSelecionada[]

    addItem({
      produto_id: produto.id,
      nome: produto.nome,
      preco_unitario: produto.preco,
      quantidade,
      customizacoes_selecionadas,
      foto_url: produto.foto_url,
    })

    onClose()
  }

  const obrigatoriosNaoSelecionados = produto.customizacoes.filter(
    (g) => g.obrigatorio && !selecoes[g.nome]
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Foto */}
        {produto.foto_url ? (
          <div className="h-48 overflow-hidden rounded-t-2xl">
            <img
              src={produto.foto_url}
              alt={produto.nome}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-32 bg-gray-100 rounded-t-2xl flex items-center justify-center text-5xl text-gray-300">
            🍽️
          </div>
        )}

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <h2 className="text-xl font-bold text-gray-900">{produto.nome}</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 ml-2 text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {produto.descricao && (
            <p className="text-gray-500 text-sm mb-4">{produto.descricao}</p>
          )}

          <p className="font-bold text-[--color-primary] text-lg mb-4">
            {produto.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>

          {/* Customizações */}
          {produto.customizacoes.map((grupo) => (
            <div key={grupo.nome} className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-sm text-gray-800">{grupo.nome}</h3>
                {grupo.obrigatorio && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    Obrigatório
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {grupo.opcoes.map((opcao) => {
                  const isSelected = selecoes[grupo.nome] === opcao.nome
                  return (
                    <label
                      key={opcao.nome}
                      className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
                      style={{
                        borderColor: isSelected ? 'var(--color-primary)' : '#e5e7eb',
                        backgroundColor: isSelected ? '#f9fafb' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name={`grupo-${grupo.nome}`}
                          value={opcao.nome}
                          checked={isSelected}
                          onChange={() => handleSeleção(grupo.nome, opcao.nome)}
                          className="accent-[--color-primary]"
                        />
                        <span className="text-sm text-gray-800">{opcao.nome}</span>
                      </div>
                      {opcao.preco_adicional > 0 && (
                        <span className="text-sm text-gray-500">
                          +{opcao.preco_adicional.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      )}
                    </label>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Quantidade */}
          <div className="flex items-center justify-between py-3 border-t border-gray-100 mb-4">
            <span className="font-medium text-sm text-gray-700">Quantidade</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              >
                −
              </button>
              <span className="font-semibold w-6 text-center">{quantidade}</span>
              <button
                type="button"
                onClick={() => setQuantidade((q) => q + 1)}
                className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
              >
                +
              </button>
            </div>
          </div>

          {/* Botão Adicionar */}
          <button
            type="button"
            onClick={handleAdicionarAoCarrinho}
            disabled={obrigatoriosNaoSelecionados.length > 0}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-[--color-primary] text-[--color-primary-fg] disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Adicionar ao carrinho •{' '}
            {precoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </button>

          {obrigatoriosNaoSelecionados.length > 0 && (
            <p className="text-center text-xs text-red-500 mt-2">
              Selecione: {obrigatoriosNaoSelecionados.map((g) => g.nome).join(', ')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
