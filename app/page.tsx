import { headers } from 'next/headers'

export default function RootPage() {
  const tenantId = headers().get('x-tenant-id')
  const tenantSlug = headers().get('x-tenant-slug')

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
