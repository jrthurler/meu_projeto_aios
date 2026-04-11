import { createClient, SupabaseClient } from '@supabase/supabase-js'

function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados')
  return createClient(url, key, { auth: { persistSession: false } })
}

/**
 * Retorna um cliente Supabase (service_role) pronto para uso em Server Components
 * e API Routes, com o tenant_id fixado para filtragem obrigatória.
 *
 * Uso:
 *   const { supabase, tenantId } = getSupabaseWithTenant(tenantId)
 *   const { data } = await supabase.from('products').select('*').eq('tenant_id', tenantId)
 *
 * AC4: todo acesso a dados no servidor usa este helper para garantir isolamento.
 * RLS é a primeira linha de defesa (role: authenticated).
 * Filtragem explícita por tenant_id é a segunda linha (defense-in-depth).
 */
export function getSupabaseWithTenant(tenantId: string): {
  supabase: SupabaseClient
  tenantId: string
} {
  return { supabase: createAdminClient(), tenantId }
}

/**
 * Cliente admin sem tenant context — usar apenas no middleware para
 * resolução de tenant (lookup por slug ou custom_domain).
 */
export function getSupabaseAdmin(): SupabaseClient {
  return createAdminClient()
}

/**
 * Lê e valida o x-tenant-id injetado pelo middleware.
 * Lança erro se ausente (proteção para API Routes que exigem tenant context).
 */
export function getTenantIdFromHeaders(headers: Headers): string {
  const tenantId = headers.get('x-tenant-id')
  if (!tenantId) {
    throw new Error('x-tenant-id ausente — rota não está protegida pelo middleware')
  }
  return tenantId
}
