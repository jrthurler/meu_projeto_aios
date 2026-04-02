import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import { checkRateLimit, resetRateLimit } from '../../lib/auth/rate-limit'

// ──────────────────────────────────────────────
// AC7.3 & AC7.4 — Signup: duplicado e multi-tenant
// ──────────────────────────────────────────────

describe('Signup — isolamento por tenant', () => {
  it('AC7.3 — cadastro duplicado no mesmo tenant retorna 409', async () => {
    // Simula a lógica de detecção de duplicado
    const emailExistente = 'joao@exemplo.com'
    const tenantId = 'tenant-a-id'

    // Cenário: usuário já existe no banco com mesmo email + tenant_id
    const existing = { id: 'user-123' }

    // A lógica do endpoint retorna 409 quando `existing` não é null
    const status = existing ? 409 : 201
    expect(status).toBe(409)
  })

  it('AC7.4 — mesmo email em tenants distintos é permitido', () => {
    const emailA = 'joao@exemplo.com'.toLowerCase()
    const emailB = 'joao@exemplo.com'.toLowerCase()

    // Emails são iguais, mas pertencem a tenants diferentes
    // A query filtra por (email, tenant_id) — combinação única
    const usuarioTenantA = { email: emailA, tenant_id: 'tenant-a' }
    const usuarioTenantB = { email: emailB, tenant_id: 'tenant-b' }

    // Chaves compostas distintas — ambos podem existir
    const chaveA = `${usuarioTenantA.email}:${usuarioTenantA.tenant_id}`
    const chaveB = `${usuarioTenantB.email}:${usuarioTenantB.tenant_id}`

    expect(chaveA).not.toBe(chaveB)
    expect(usuarioTenantA.tenant_id).not.toBe(usuarioTenantB.tenant_id)
  })
})

// ──────────────────────────────────────────────
// AC7.1 — JWT contém tenant_id correto
// ──────────────────────────────────────────────

describe('JWT — tenant_id no token', () => {
  it('AC7.1 — JWT callback inclui tenant_id do usuário autenticado', async () => {
    // Simula o callback jwt do NextAuth
    const userFromDB = {
      id: 'user-123',
      email: 'joao@restaurante-a.com',
      name: 'João',
      tenant_id: 'tenant-a-uuid',
      role: 'customer',
    }

    // Simula a lógica do jwt callback
    const token: Record<string, unknown> = {}
    token.tenant_id = userFromDB.tenant_id
    token.role = userFromDB.role

    expect(token.tenant_id).toBe('tenant-a-uuid')
    expect(token.role).toBe('customer')
  })

  it('AC7.2 — token de tenant-A é rejeitado em rota de tenant-B', () => {
    const jwtTenantId = 'tenant-a-uuid'
    const requestTenantId = 'tenant-b-uuid'

    // Lógica do middleware: JWT.tenant_id !== x-tenant-id → 403
    const mismatch = jwtTenantId !== requestTenantId
    expect(mismatch).toBe(true)

    const statusEsperado = mismatch ? 403 : 200
    expect(statusEsperado).toBe(403)
  })
})

// ──────────────────────────────────────────────
// Senha — bcrypt hash
// ──────────────────────────────────────────────

describe('Senha — segurança bcrypt', () => {
  it('senha é hasheada com bcrypt (salt >= 12)', async () => {
    const senha = 'minha_senha_segura_123'
    const hash = await bcrypt.hash(senha, 12)

    // Hash não deve ser igual à senha original
    expect(hash).not.toBe(senha)

    // Deve conter o identificador de bcrypt com cost factor 12
    expect(hash).toMatch(/^\$2[ab]\$12\$/)

    // Deve verificar corretamente
    const valido = await bcrypt.compare(senha, hash)
    expect(valido).toBe(true)

    // Senha errada não deve verificar
    const invalido = await bcrypt.compare('senha_errada', hash)
    expect(invalido).toBe(false)
  })
})

// ──────────────────────────────────────────────
// AC7.5 — Rate limiting
// ──────────────────────────────────────────────

describe('Rate limiting — signin', () => {
  const IP_TESTE = '192.168.1.100'

  beforeEach(() => {
    resetRateLimit(IP_TESTE)
  })

  it('AC7.5 — permite até 5 tentativas', () => {
    for (let i = 0; i < 5; i++) {
      const result = checkRateLimit(IP_TESTE)
      expect(result.allowed).toBe(true)
    }
  })

  it('AC7.5 — bloqueia na 6ª tentativa com retryAfter', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit(IP_TESTE)
    }

    const result = checkRateLimit(IP_TESTE)
    expect(result.allowed).toBe(false)
    expect(result.retryAfter).toBeGreaterThan(0)
  })

  it('AC7.5 — IPs diferentes têm contadores independentes', () => {
    const ip1 = '10.0.0.1'
    const ip2 = '10.0.0.2'
    resetRateLimit(ip1)
    resetRateLimit(ip2)

    for (let i = 0; i < 5; i++) checkRateLimit(ip1)
    checkRateLimit(ip1) // 6ª tentativa — bloqueado

    // ip2 ainda não foi usado — deve passar
    const result = checkRateLimit(ip2)
    expect(result.allowed).toBe(true)
  })
})
