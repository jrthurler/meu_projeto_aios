import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Supabase antes de importar o módulo
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@supabase/supabase-js'
import { resolveTenantFromHostname } from '../../lib/tenant/resolver'

// Configura env vars para os testes
beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  process.env.NEXT_PUBLIC_BASE_DOMAIN = 'plataforma.com'
})

function mockSupabase(data: unknown, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  ;(createClient as ReturnType<typeof vi.fn>).mockReturnValue({ from })
  return { from, select, eq, single }
}

describe('resolveTenantFromHostname', () => {
  it('resolve tenant por subdomínio válido', async () => {
    const tenant = { id: '11111111-1111-1111-1111-111111111111', slug: 'restaurante-a', nome: 'Restaurante A', ativo: true }
    mockSupabase(tenant)

    const result = await resolveTenantFromHostname('restaurante-a.plataforma.com')

    expect(result).toEqual(tenant)
  })

  it('retorna null para slug inválido (tenant não encontrado)', async () => {
    mockSupabase(null)

    const result = await resolveTenantFromHostname('nao-existe.plataforma.com')

    expect(result).toBeNull()
  })

  it('resolve tenant por domínio customizado', async () => {
    const tenant = { id: '22222222-2222-2222-2222-222222222222', slug: 'restaurante-b', nome: 'Restaurante B', ativo: true }
    mockSupabase(tenant)

    const result = await resolveTenantFromHostname('delivery.restauranteb.com.br')

    expect(result).toEqual(tenant)
  })

  it('retorna null para domínio customizado não cadastrado', async () => {
    mockSupabase(null)

    const result = await resolveTenantFromHostname('dominio-invalido.com')

    expect(result).toBeNull()
  })

  it('retorna null para o domínio raiz (sem subdomínio)', async () => {
    const result = await resolveTenantFromHostname('plataforma.com')

    expect(result).toBeNull()
  })

  it('ignora porta no hostname (dev local)', async () => {
    const tenant = { id: '11111111-1111-1111-1111-111111111111', slug: 'restaurante-a', nome: 'Restaurante A', ativo: true }
    mockSupabase(tenant)
    process.env.NEXT_PUBLIC_BASE_DOMAIN = 'localhost:3000'

    const result = await resolveTenantFromHostname('restaurante-a.localhost:3000')

    expect(result).toEqual(tenant)
  })

  it('retorna tenant-a e tenant-b com IDs distintos (isolamento)', async () => {
    const tenantA = { id: '11111111-1111-1111-1111-111111111111', slug: 'restaurante-a', nome: 'Restaurante A', ativo: true }
    const tenantB = { id: '22222222-2222-2222-2222-222222222222', slug: 'restaurante-b', nome: 'Restaurante B', ativo: true }

    mockSupabase(tenantA)
    const resultA = await resolveTenantFromHostname('restaurante-a.plataforma.com')

    mockSupabase(tenantB)
    // Limpa cache para testar o segundo tenant
    const mod = await import('../../lib/tenant/resolver')
    // @ts-expect-error acesso interno para teste
    mod.cache?.clear()
    const resultB = await resolveTenantFromHostname('restaurante-b.plataforma.com')

    expect(resultA?.id).not.toBe(resultB?.id)
    expect(resultA?.slug).toBe('restaurante-a')
    expect(resultB?.slug).toBe('restaurante-b')
  })
})
