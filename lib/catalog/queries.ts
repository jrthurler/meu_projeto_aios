// lib/catalog/queries.ts
// AC5: single SELECT por endpoint, service_role para bypass de RLS
// Filtros manuais por tenant_id + disponivel/ativo

import { createClient } from '@supabase/supabase-js'
import type { Categoria, Produto } from './types'

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// AC1: categorias ativas, ordenadas
export async function getCategories(tenantId: string): Promise<Categoria[]> {
  const { data, error } = await getClient()
    .from('product_categories')
    .select('id, nome, descricao, imagem_url, ordem')
    .eq('tenant_id', tenantId)
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error || !data) return []

  return data as Categoria[]
}

// AC2: produtos disponíveis com filtros opcionais
export async function getProducts(
  tenantId: string,
  options: { categoriaId?: string; query?: string } = {}
): Promise<Produto[]> {
  let builder = getClient()
    .from('products')
    .select('id, categoria_id, nome, descricao, preco, foto_url, ordem, customizacoes')
    .eq('tenant_id', tenantId)
    .eq('disponivel', true)

  if (options.categoriaId) {
    builder = builder.eq('categoria_id', options.categoriaId)
  }

  // AC5: ILIKE para busca simples — full-text search reservado para Epic 6
  if (options.query) {
    builder = builder.ilike('nome', `%${options.query}%`)
  }

  const { data, error } = await builder
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })

  if (error || !data) return []

  return data.map((p) => ({
    ...p,
    preco: Number(p.preco),
    customizacoes: Array.isArray(p.customizacoes) ? p.customizacoes : [],
  })) as Produto[]
}

// AC3: produto individual — 404 se não pertencer ao tenant
export async function getProductById(
  tenantId: string,
  productId: string
): Promise<Produto | null> {
  const { data, error } = await getClient()
    .from('products')
    .select('id, categoria_id, nome, descricao, preco, foto_url, ordem, customizacoes')
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .eq('disponivel', true)
    .single()

  if (error || !data) return null

  return {
    ...data,
    preco: Number(data.preco),
    customizacoes: Array.isArray(data.customizacoes) ? data.customizacoes : [],
  } as Produto
}
