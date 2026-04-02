import { createClient } from '@supabase/supabase-js'
import { isRestaurantOpen } from './hours'
import type { TenantConfig } from './types'

// AC4: campos sensíveis NUNCA retornados
const CAMPOS_PUBLICOS =
  'id, slug, nome, logo_url, banner_url, cor_primaria, cor_primaria_texto, horarios, ativo, frete_base, frete_gratis_acima, tempo_preparo_min, atualizado_em'

export async function getTenantConfig(tenantId: string): Promise<TenantConfig | null> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // AC4: single SELECT — sem N+1 queries
  const { data, error } = await supabase
    .from('tenants')
    .select(CAMPOS_PUBLICOS)
    .eq('id', tenantId)
    .single()

  if (error || !data) return null

  // AC2: status calculado server-side com timezone America/Sao_Paulo
  const status: 'open' | 'closed' =
    data.ativo && isRestaurantOpen(data.horarios) ? 'open' : 'closed'

  return {
    id: data.id,
    slug: data.slug,
    nome: data.nome,
    logo_url: data.logo_url ?? null,
    banner_url: data.banner_url ?? null,
    cor_primaria: data.cor_primaria ?? '#000000',
    cor_primaria_texto: data.cor_primaria_texto ?? '#FFFFFF',
    horarios: data.horarios ?? {},
    status,
    frete_base: data.frete_base ?? 0,
    frete_gratis_acima: data.frete_gratis_acima ?? 0,
    tempo_preparo_min: data.tempo_preparo_min ?? 30,
  }
}
