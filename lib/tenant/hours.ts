import type { HorariosSemana } from './types'

const TIMEZONE = 'America/Sao_Paulo'

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const
type DiaSemana = typeof DIAS_SEMANA[number]

/**
 * AC2: Verifica se o restaurante está aberto agora.
 * Usa timezone America/Sao_Paulo explicitamente.
 */
export function isRestaurantOpen(horarios: HorariosSemana | null | undefined): boolean {
  if (!horarios) return false

  const agora = new Date()
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIMEZONE,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const partes = formatter.formatToParts(agora)
  const horaAtual = partes.find((p) => p.type === 'hour')?.value ?? '00'
  const minutoAtual = partes.find((p) => p.type === 'minute')?.value ?? '00'
  const diaSemanaIndex = agora.toLocaleDateString('en-US', { timeZone: TIMEZONE, weekday: 'short' })

  // Mapear weekday inglês para chave em português
  const mapaIngPt: Record<string, DiaSemana> = {
    Sun: 'domingo',
    Mon: 'segunda',
    Tue: 'terca',
    Wed: 'quarta',
    Thu: 'quinta',
    Fri: 'sexta',
    Sat: 'sabado',
  }

  const diaChave = mapaIngPt[diaSemanaIndex]
  if (!diaChave) return false

  const horarioDia = horarios[diaChave]
  if (!horarioDia?.aberto || !horarioDia.inicio || !horarioDia.fim) return false

  const horaMinutoAtual = `${horaAtual}:${minutoAtual}`
  return horaMinutoAtual >= horarioDia.inicio && horaMinutoAtual <= horarioDia.fim
}
