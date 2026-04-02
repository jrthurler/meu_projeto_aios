import { headers } from 'next/headers'
import { getTenantConfig } from '@/lib/tenant/config'

export default async function TenantHomePage() {
  const tenantId = headers().get('x-tenant-id')
  const config = tenantId ? await getTenantConfig(tenantId) : null

  if (!config) {
    return (
      <main style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
        <p>Restaurante não encontrado.</p>
      </main>
    )
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Hero com banner */}
      {config.banner_url && (
        <div
          style={{
            width: '100%',
            height: 200,
            backgroundImage: `url(${config.banner_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1rem' }}>
        {/* Logo e nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          {config.logo_url && (
            <img
              src={config.logo_url}
              alt={`Logo ${config.nome}`}
              style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }}
            />
          )}
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>{config.nome}</h1>
            <span
              style={{
                display: 'inline-block',
                marginTop: '0.25rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 999,
                fontSize: '0.75rem',
                fontWeight: 600,
                background: config.status === 'open' ? '#d1fae5' : '#fee2e2',
                color: config.status === 'open' ? '#065f46' : '#991b1b',
              }}
            >
              {config.status === 'open' ? 'Aberto' : 'Fechado'}
            </span>
          </div>
        </div>

        {/* Informações de entrega */}
        <div style={{ display: 'flex', gap: '1.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
          <span>🛵 Frete: R$ {config.frete_base.toFixed(2)}</span>
          {config.frete_gratis_acima > 0 && (
            <span>✅ Grátis acima de R$ {config.frete_gratis_acima.toFixed(2)}</span>
          )}
          <span>⏱ {config.tempo_preparo_min} min</span>
        </div>
      </div>
    </main>
  )
}
