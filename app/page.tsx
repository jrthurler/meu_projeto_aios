import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const tenantId = (await headers()).get('x-tenant-id')

  if (tenantId) {
    redirect('/menu')
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
      <h1>Delivery Platform</h1>
      <p>Acesse via subdomínio do restaurante: <code>restaurante-a.localhost:3000</code></p>
    </main>
  )
}
