import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12 // AC1: bcrypt salt rounds >= 12

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id')

  // AC1: tenant_id extraído do header, nunca do body
  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant não identificado' }, { status: 400 })
  }

  let body: { email?: string; nome?: string; senha?: string; telefone?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { email, nome, senha, telefone } = body

  if (!email || !nome || !senha) {
    return NextResponse.json({ error: 'email, nome e senha são obrigatórios' }, { status: 400 })
  }

  // AC1: email normalizado para lowercase
  const emailNormalizado = email.toLowerCase().trim()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // AC1: retorna 409 se email já existe no mesmo tenant
  const { data: existing } = await supabase
    .from('tenant_users')
    .select('id')
    .eq('email', emailNormalizado)
    .eq('tenant_id', tenantId)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
  }

  // AC1: senha hasheada com bcrypt — nunca armazenar plaintext
  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS)

  const { data: novoUsuario, error } = await supabase
    .from('tenant_users')
    .insert({
      email: emailNormalizado,
      nome,
      senha_hash: senhaHash,
      telefone: telefone ?? null,
      tenant_id: tenantId,
      role: 'customer',
      ativo: true,
    })
    .select('id, email, nome, tenant_id')
    .single()

  if (error || !novoUsuario) {
    console.error('[signup] Erro ao criar usuário:', error?.message)
    return NextResponse.json({ error: 'Erro ao criar conta' }, { status: 500 })
  }

  // AC1: e-mail de verificação via Resend (não bloqueia o fluxo)
  void enviarEmailVerificacao(novoUsuario.email, novoUsuario.nome).catch((err) =>
    console.error('[signup] Falha ao enviar email de verificação:', err)
  )

  return NextResponse.json(
    { id: novoUsuario.id, email: novoUsuario.email, nome: novoUsuario.nome },
    { status: 201 }
  )
}

async function enviarEmailVerificacao(email: string, nome: string): Promise<void> {
  // Resend integration — placeholder para configuração futura
  // Requer RESEND_API_KEY no .env.local
  if (!process.env.RESEND_API_KEY) return
  // TODO: implementar com SDK do Resend quando chave estiver disponível
  console.log(`[signup] Email de verificação pendente para: ${email} (${nome})`)
}
