import { createClient } from '@supabase/supabase-js'

export interface TenantResolution {
  id: string
  slug: string
  nome: string
  ativo: boolean
}

// Cache em memória para edge runtime (sem Redis disponível no edge)
// TTL de 60s conforme AC5
const cache = new Map<string, { data: TenantResolution | null; expiresAt: number }>()
const CACHE_TTL_MS = 60_000

function getCached(key: string): TenantResolution | null | undefined {
  const entry = cache.get(key)
  if (!entry) return undefined
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return undefined
  }
  return entry.data
}

function setCached(key: string, data: TenantResolution | null): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS })
}

/**
 * Resolve o tenant a partir do hostname da requisição.
 *
 * Estratégia:
 * 1. Se hostname termina com BASE_DOMAIN → extrai slug do subdomínio
 * 2. Caso contrário → trata como custom_domain e busca por correspondência exata
 *
 * Retorna null se tenant não encontrado.
 * Compatível com edge runtime (sem Node.js APIs).
 */
export async function resolveTenantFromHostname(
  hostname: string
): Promise<TenantResolution | null> {
  // Normaliza: remove porta (para desenvolvimento local com :3000)
  const host = hostname.split(':')[0].toLowerCase()

  const cached = getCached(host)
  if (cached !== undefined) return cached

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase env vars não configuradas')
  }

  // service_role bypassa RLS — necessário para resolver tenants sem contexto
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'localhost'
  const baseDomainHost = baseDomain.split(':')[0].toLowerCase()

  let result: TenantResolution | null = null

  if (host === baseDomainHost || host === 'localhost') {
    // Acesso direto ao domínio raiz — sem tenant
    setCached(host, null)
    return null
  }

  if (host.endsWith(`.${baseDomainHost}`)) {
    // Estratégia 1: resolução por subdomínio (slug.plataforma.com)
    const slug = host.replace(`.${baseDomainHost}`, '')
    const { data } = await supabase
      .from('tenants')
      .select('id, slug, nome, ativo')
      .eq('slug', slug)
      .single()
    result = data ?? null
  } else {
    // Estratégia 2: resolução por domínio customizado
    const { data } = await supabase
      .from('tenants')
      .select('id, slug, nome, ativo')
      .eq('custom_domain', host)
      .single()
    result = data ?? null
  }

  setCached(host, result)
  return result
}
