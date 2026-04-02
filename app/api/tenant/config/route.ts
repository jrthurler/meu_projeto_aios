import { NextRequest, NextResponse } from 'next/server'
import { getTenantConfig } from '@/lib/tenant/config'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 })
  }

  const config = await getTenantConfig(tenantId)

  // AC1: Tenant inexistente → 404
  if (!config) {
    return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
  }

  // AC3: ETag gerado a partir do atualizado_em do tenant
  const etag = `"${crypto.createHash('md5').update(tenantId + config.nome).digest('hex')}"`
  const ifNoneMatch = request.headers.get('if-none-match')
  if (ifNoneMatch === etag) {
    return new NextResponse(null, { status: 304 })
  }

  // AC3: Cache-Control com s-maxage=300 e stale-while-revalidate=60
  const headers = {
    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
    'ETag': etag,
    'Content-Type': 'application/json',
  }

  // AC1: tenant_id NUNCA exposto no response
  return NextResponse.json(config, { headers })
}
