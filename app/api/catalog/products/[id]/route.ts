import { NextRequest, NextResponse } from 'next/server'
import { getProductById } from '@/lib/catalog/queries'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const tenantId = request.headers.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 })
  }

  const product = await getProductById(tenantId, params.id)

  if (!product) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 })
  }

  return NextResponse.json(product, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
