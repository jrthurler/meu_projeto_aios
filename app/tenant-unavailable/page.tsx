export default function TenantUnavailable() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111' }}>
        Restaurante temporariamente indisponível
      </h1>
      <p style={{ color: '#555', marginTop: '0.75rem' }}>
        Este restaurante está temporariamente fora do ar.
      </p>
      <p style={{ color: '#888', marginTop: '0.5rem', fontSize: '0.875rem' }}>
        Tente novamente mais tarde.
      </p>
    </main>
  )
}
