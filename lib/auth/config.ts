import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        senha: { label: 'Senha', type: 'password' },
        tenant_id: { label: 'Tenant ID', type: 'text' },
      },
      async authorize(credentials) {
        const { email, senha, tenant_id } = credentials as {
          email: string
          senha: string
          tenant_id: string
        }

        if (!email || !senha || !tenant_id) return null

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        )

        const { data: user } = await supabase
          .from('tenant_users')
          .select('id, email, nome, senha_hash, ativo, tenant_id, role')
          .eq('email', email.toLowerCase())
          .eq('tenant_id', tenant_id)
          .single()

        // AC2: mensagem genérica — não vazar se é email ou senha errada
        if (!user) return null

        // AC2: tenant inativo → 403 (tratado no authorize retornando null, middleware bloqueia)
        if (!user.ativo) {
          throw new Error('ACCOUNT_DISABLED')
        }

        const senhaValida = await bcrypt.compare(senha, user.senha_hash)
        if (!senhaValida) return null

        return {
          id: user.id,
          email: user.email,
          name: user.nome,
          tenant_id: user.tenant_id,
          role: user.role ?? 'customer',
        }
      },
    }),
  ],

  callbacks: {
    // AC3: JWT contém tenant_id como claim obrigatório
    async jwt({ token, user }) {
      if (user) {
        token.tenant_id = (user as any).tenant_id
        token.role = (user as any).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).tenant_id = token.tenant_id
        ;(session.user as any).role = token.role
      }
      return session
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // AC3: 30 dias
  },

  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,      // AC6: HttpOnly
        secure: process.env.NODE_ENV === 'production', // AC6: Secure em prod
        sameSite: 'lax',     // AC6: SameSite=Lax
      },
    },
  },

  pages: {
    signIn: '/account/login',
    signOut: '/',
  },
})
