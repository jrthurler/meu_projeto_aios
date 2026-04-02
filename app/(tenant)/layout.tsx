import '../globals.css'
import { headers } from 'next/headers'
import { getTenantConfig } from '@/lib/tenant/config'
import { CartButton } from '@/components/cart/CartButton'
import type { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
  const tenantId = (await headers()).get('x-tenant-id')
  if (!tenantId) return { title: 'Delivery' }

  const config = await getTenantConfig(tenantId)
  if (!config) return { title: 'Delivery' }

  // AC5: nome do tenant no <title> e meta tags OG
  return {
    title: config.nome,
    description: `Peça agora no ${config.nome}`,
    openGraph: {
      title: config.nome,
      images: config.banner_url ? [config.banner_url] : [],
    },
  }
}

export default async function TenantLayout({ children }: { children: React.ReactNode }) {
  const tenantId = (await headers()).get('x-tenant-id')
  const config = tenantId ? await getTenantConfig(tenantId) : null

  // AC5: CSS vars injetadas no <html> para Tailwind v4 consumir
  const cssVars = config
    ? ({
        '--color-primary': config.cor_primaria,
        '--color-primary-fg': config.cor_primaria_texto,
      } as React.CSSProperties)
    : {}

  return (
    <html lang="pt-BR" style={cssVars}>
      <body>
        {/* AC5: banner de fechado */}
        {config?.status === 'closed' && (
          <div
            style={{
              background: '#1f2937',
              color: '#f9fafb',
              textAlign: 'center',
              padding: '0.5rem',
              fontSize: '0.875rem',
            }}
          >
            Fechado no momento — Consulte nossos horários de funcionamento
          </div>
        )}
        {/* AC7 (Story 2.3): header com CartButton */}
        {config && (
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #e5e7eb',
              background: 'white',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {config.logo_url && (
                <img
                  src={config.logo_url}
                  alt={config.nome}
                  style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover' }}
                />
              )}
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{config.nome}</span>
            </div>
            <CartButton />
          </header>
        )}
        {children}
      </body>
    </html>
  )
}
