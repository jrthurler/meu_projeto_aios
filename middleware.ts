import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromHostname } from '@/lib/tenant/resolver'
import { auth } from '@/lib/auth/config'
import { checkRateLimit } from '@/lib/auth/rate-limit'

// Rotas excluídas do tenant context (AC6)
const BYPASS_PREFIXES = ['/_next/', '/favicon.ico', '/api/webhooks/']
const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf)$/

// Rotas protegidas que exigem autenticação
const PROTECTED_ROUTES = ['/api/orders']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') ?? ''

  // AC6 — Ignorar assets estáticos e rotas excluídas
  if (
    BYPASS_PREFIXES.some((p) => pathname.startsWith(p)) ||
    STATIC_EXTENSIONS.test(pathname)
  ) {
    return NextResponse.next()
  }

  // AC6: Rate limiting para rota de signin
  if (pathname === '/api/auth/signin') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
    const { allowed, retryAfter } = checkRateLimit(ip)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Muitas tentativas. Tente novamente mais tarde.' },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      )
    }
  }

  // Resolver tenant pelo hostname
  let tenant
  try {
    tenant = await resolveTenantFromHostname(hostname)
  } catch (err) {
    console.error('[middleware] Erro ao resolver tenant:', err)
    return new NextResponse('Erro interno ao resolver tenant', { status: 500 })
  }

  // Tenant não encontrado → 404
  if (tenant === null) {
    const url = request.nextUrl.clone()
    url.pathname = '/not-found'
    return NextResponse.rewrite(url)
  }

  // Tenant inativo → 503
  if (!tenant.ativo) {
    const url = request.nextUrl.clone()
    url.pathname = '/tenant-unavailable'
    return NextResponse.rewrite(url)
  }

  // AC3 — Injetar x-tenant-id em todas as rotas válidas
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-tenant-id', tenant.id)
  requestHeaders.set('x-tenant-slug', tenant.slug)

  // AC3: Validar JWT.tenant_id == x-tenant-id em rotas protegidas
  const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r))
  if (isProtected) {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const jwtTenantId = (session.user as any).tenant_id
    if (jwtTenantId !== tenant.id) {
      // AC3: token válido, mas não para este tenant → 403
      return NextResponse.json(
        { error: 'Token inválido para este restaurante' },
        { status: 403 }
      )
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
