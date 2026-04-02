export default function NotFound() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, color: '#111' }}>
        Restaurante não encontrado
      </h1>
      <p style={{ color: '#555', marginTop: '0.75rem' }}>
        O endereço acessado não corresponde a nenhum restaurante cadastrado na plataforma.
      </p>
      <p style={{ color: '#888', marginTop: '0.5rem', fontSize: '0.875rem' }}>
        Verifique o endereço e tente novamente.
      </p>
    </main>
  )
}
