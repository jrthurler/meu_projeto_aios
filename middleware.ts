import { NextRequest, NextResponse } from 'next/server'
import { resolveTenantFromHostname } from '@/lib/tenant/resolver'

// Rotas excluídas do tenant context (AC6)
const BYPASS_PREFIXES = ['/_next/', '/favicon.ico', '/api/webhooks/']
const STATIC_EXTENSIONS = /\.(png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf)$/

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

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    // Aplica em todas as rotas exceto assets internos do Next.js
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
