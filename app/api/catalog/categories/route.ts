import { NextRequest, NextResponse } from 'next/server'
import { getCategories } from '@/lib/catalog/queries'

export async function GET(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 })
  }

  const categories = await getCategories(tenantId)

  return NextResponse.json(categories, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
    },
  })
}
