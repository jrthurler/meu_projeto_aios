import { auth } from '@/lib/auth/config'
import { NextRequest, NextResponse } from 'next/server'

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  tenant_id: string
  role: string
}

/**
 * AC4: Helper para obter usuário autenticado em API Routes.
 * Valida que JWT.tenant_id == x-tenant-id do request.
 *
 * @returns AuthenticatedUser ou NextResponse de erro (401/403)
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<AuthenticatedUser | NextResponse> {
  const session = await auth()

  // AC4: 401 sem token
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const requestTenantId = request.headers.get('x-tenant-id')
  const sessionTenantId = (session.user as any).tenant_id

  // AC3: JWT.tenant_id deve corresponder ao tenant da requisição
  if (!requestTenantId || sessionTenantId !== requestTenantId) {
    return NextResponse.json(
      { error: 'Token inválido para este restaurante' },
      { status: 403 }
    )
  }

  return {
    id: session.user.id!,
    email: session.user.email!,
    name: session.user.name!,
    tenant_id: sessionTenantId,
    role: (session.user as any).role ?? 'customer',
  }
}

/**
 * Type guard: verifica se o resultado é um usuário autenticado (não um NextResponse de erro)
 */
export function isAuthError(result: AuthenticatedUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}
