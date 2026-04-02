// AC1: Server Component — busca dados no servidor, passa para client shell
import { headers } from 'next/headers'
import { getCategories, getProducts } from '@/lib/catalog/queries'
import { MenuClient } from '@/components/catalog/MenuClient'

export default async function MenuPage() {
  const tenantId = headers().get('x-tenant-id')

  if (!tenantId) {
    return (
      <main className="text-center py-16 text-gray-400">
        <p>Restaurante não encontrado.</p>
      </main>
    )
  }

  // Busca paralela de categorias e produtos
  const [categorias, produtos] = await Promise.all([
    getCategories(tenantId),
    getProducts(tenantId),
  ])

  return <MenuClient categorias={categorias} produtos={produtos} />
}
