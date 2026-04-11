'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setCarregando(true)

    // tenant_id é injetado automaticamente pelo middleware via x-tenant-id
    // O NextAuth lê o header no authorize callback via request
    const result = await signIn('credentials', {
      email,
      senha,
      redirect: false,
    })

    setCarregando(false)

    if (result?.error === 'ACCOUNT_DISABLED') {
      setErro('Conta desativada. Entre em contato com o restaurante.')
      return
    }

    if (result?.error) {
      // AC2: mensagem genérica — não especificar se email ou senha errada
      setErro('Email ou senha incorretos.')
      return
    }

    router.push('/')
    router.refresh()
  }

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 400, margin: '4rem auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Entrar</h1>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box' }}
          />
        </div>

        {erro && (
          <p style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{erro}</p>
        )}

        <button
          type="submit"
          disabled={carregando}
          style={{
            padding: '0.625rem',
            background: carregando ? '#9ca3af' : '#111',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: carregando ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
          }}
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
