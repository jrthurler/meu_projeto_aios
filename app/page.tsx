import { headers } from 'next/headers'

export default async function RootPage() {
  const h = await headers()
  const tenantId = h.get('x-tenant-id')
  const tenantSlug = h.get('x-tenant-slug')

  if (tenantId) {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
        <h1>Tenant Resolvido ✓</h1>
        <p><strong>Slug:</strong> <code>{tenantSlug}</code></p>
        <p><strong>ID:</strong> <code>{tenantId}</code></p>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
      <h1>Delivery Platform</h1>
      <p>Acesse via subdomínio do restaurante: <code>restaurante-a.localhost:3000</code></p>
    </main>
  )
}
