import { NextRequest, NextResponse } from 'next/server'
import { getProducts } from '@/lib/catalog/queries'

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const categoriaId = searchParams.get('categoria_id') ?? undefined
  const query = searchParams.get('q') ?? undefined

  const products = await getProducts(tenantId, { categoriaId, query })

  return NextResponse.json(products, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
