'use client'

import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase para uso no browser (Client Components).
 * Usa a anon key — RLS filtra dados via JWT do usuário autenticado.
 * NÃO tem tenant context explícito: o JWT do NextAuth contém tenant_id
 * e as policies RLS validam automaticamente (Story 1.3).
 */
export function getSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY não configurados')
  return createClient(url, key)
}
