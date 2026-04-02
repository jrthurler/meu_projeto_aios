// Contrato de API — TenantConfig (consumido por Epic 2, Epic 5)

export interface HorarioDia {
  aberto: boolean
  inicio?: string // "HH:MM"
  fim?: string    // "HH:MM"
}

export interface HorariosSemana {
  segunda?: HorarioDia
  terca?: HorarioDia
  quarta?: HorarioDia
  quinta?: HorarioDia
  sexta?: HorarioDia
  sabado?: HorarioDia
  domingo?: HorarioDia
}

export interface TenantConfig {
  id: string
  slug: string
  nome: string
  logo_url: string | null
  banner_url: string | null
  cor_primaria: string
  cor_primaria_texto: string
  horarios: HorariosSemana
  status: 'open' | 'closed'
  frete_base: number
  frete_gratis_acima: number
  tempo_preparo_min: number
}
