# Arquitetura Full-Stack — Plataforma Multi-Tenant de Delivery

**Versão:** 1.0.0
**Status:** Proposta — aguarda aprovação do stakeholder
**Data:** 2026-04-01
**Autor:** Aria (Architect)
**PRD:** `docs/prd/delivery-platform.md` v1.1.0

---

## 1. Decisão Central: Estratégia de Multi-Tenancy

> **Esta é a decisão mais importante do projeto.** Desbloqueia Story 1.1.

### Opções Avaliadas

| Estratégia | Isolamento | Complexidade | Custo | Escalabilidade |
|-----------|-----------|--------------|-------|----------------|
| **A. Schema-per-tenant** | Máximo | Alta | Alto (1 schema/tenant) | Limitada (100s tenants) |
| **B. Row-Level Security (RLS)** | Alto | Média | Baixo (1 DB compartilhado) | Alta (1000s tenants) |
| **C. Database-per-tenant** | Máximo | Muito alta | Muito alto | Muito limitada |

### **Decisão: Row-Level Security (Opção B)**

**Justificativa:**
- MVP precisa de time-to-market rápido e custo controlado
- Supabase tem RLS nativo e battle-tested
- 100+ tenants são perfeitamente viáveis com RLS
- Schema-per-tenant só compensa acima de 500+ tenants com dados massivos
- Reversível: se escala exigir, migração para schema-per-tenant é factível

**Implementação:** `tenant_id UUID NOT NULL` em todas as tabelas + política RLS `tenant_id = get_current_tenant_id()`.

---

## 2. Stack Tecnológica

### Visão Geral

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser/PWA)                    │
│              Next.js 14 App Router + Tailwind v4                │
│              shadcn/ui + React Query + Zustand                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────▼────────────────────────────────────┐
│                    ROTEAMENTO / EDGE                            │
│              Cloudflare (DNS wildcard + CNAME proxy)            │
│              Middleware Next.js → resolve tenant_id             │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    APLICAÇÃO (Next.js)                          │
│  App Router (RSC)    │  API Routes (/api/*)                     │
│  Server Components   │  Middleware (tenant resolution)          │
│  Server Actions      │  Auth (NextAuth.js v5)                   │
└──────────┬───────────┴──────────────────┬───────────────────────┘
           │                              │
┌──────────▼──────────┐      ┌────────────▼────────────────────────┐
│   SUPABASE          │      │   SERVIÇOS EXTERNOS                 │
│   PostgreSQL + RLS  │      │   Pagar.me (pagamentos BR)          │
│   Realtime          │      │   Cloudflare R2 (imagens)           │
│   Storage           │      │   Zenvia/Twilio (SMS/WhatsApp)      │
│   Auth (fallback)   │      │   Resend (e-mail transacional)      │
└─────────────────────┘      └─────────────────────────────────────┘
```

### Stack Detalhada

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Frontend** | Next.js 14 (App Router) | SSR/SSG nativo, RSC para performance, middleware para tenant routing |
| **UI** | Tailwind v4 + shadcn/ui | Theming por CSS vars (essencial para branding por tenant) |
| **Estado cliente** | Zustand + React Query | Zustand para cart/session; React Query para server state + cache |
| **Backend** | Next.js API Routes + Server Actions | Monorepo simples; Server Actions para mutations |
| **Database** | Supabase (PostgreSQL) | RLS nativo, Realtime, Storage integrado, auth built-in |
| **Auth** | NextAuth.js v5 (Auth.js) | Flexível, suporta tenant_id no JWT, múltiplos providers |
| **Pagamentos** | Pagar.me | Melhor opção BR: PIX nativo, split payments, antifraude |
| **Imagens** | Cloudflare R2 + Images | Custo baixo, CDN global, transformações on-the-fly |
| **Real-time** | Supabase Realtime | Ideal para status do pedido; já incluído no plano |
| **Notificações** | Zenvia (SMS/WhatsApp BR) | Melhor cobertura nacional; fallback Twilio |
| **E-mail** | Resend | Developer-friendly, templates React Email |
| **Deploy** | Vercel | Next.js nativo, Edge Network, domínios customizados fácil |
| **DNS/CDN** | Cloudflare | Wildcard DNS `*.plataforma.com`, proteção DDoS, CNAME flattening |

---

## 3. Arquitetura de Multi-Tenancy

### Fluxo de Resolução de Tenant

```
Request: cardapio.meurestaurante.com/menu

1. Cloudflare DNS → resolve *.plataforma.com → Vercel Edge
2. Next.js Middleware (edge runtime):
   a. Extrai hostname da request
   b. Query: SELECT id, config FROM tenants WHERE slug = 'cardapio' OR custom_domain = 'cardapio.meurestaurante.com'
   c. Injeta tenant_id em request.headers['x-tenant-id']
   d. Cache: 60s (Vercel Edge KV ou headers Cache-Control)
3. Server Components leem x-tenant-id do header
4. Supabase RLS: SET app.current_tenant_id = '{tenant_id}'
5. Todas as queries filtradas automaticamente por RLS
```

### Domínio Customizado

```
Restaurante configura CNAME:
delivery.meusushi.com.br → plataforma.com (Cloudflare proxy)

Cloudflare → forwarda header Host original
Next.js Middleware → lookup por custom_domain na tabela tenants
```

### Branding Dinâmico (CSS Custom Properties)

```tsx
// Server Component → Layout do Tenant
const config = await getTenantConfig(tenantId)

// Injeta CSS vars no root da aplicação do tenant
<html style={{
  '--color-primary': config.cor_primaria,
  '--color-primary-fg': config.cor_primaria_texto,
  '--tenant-logo': `url(${config.logo_url})`,
}}>
```

Tailwind v4 consome as CSS vars → branding completo sem rebuild.

---

## 4. Arquitetura de Dados (Alto Nível)

> Schema detalhado delegado a `@data-engineer`. Aqui: decisões de produto que impactam estrutura.

### Entidades Principais

```
tenants
  id, slug, nome, custom_domain, config (JSONB), plano, ativo

tenant_users (clientes finais)
  id, tenant_id, email, nome, telefone, criado_em
  [RLS: tenant_id = current_tenant_id()]

products
  id, tenant_id, categoria_id, nome, descricao, preco, foto_url, disponivel
  [RLS: tenant_id = current_tenant_id()]

orders
  id, tenant_id, user_id, status, subtotal, frete, total, endereco (JSONB), pagamento_id
  [RLS: tenant_id = current_tenant_id()]

order_items
  id, order_id, product_id, quantidade, preco_unitario, customizacoes (JSONB)
  [RLS: via join com orders]
```

### Estratégia de RLS

```sql
-- Função helper
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
  SELECT current_setting('app.current_tenant_id', true)::UUID
$$ LANGUAGE sql STABLE;

-- Política padrão (aplicar a TODAS as tabelas multi-tenant)
CREATE POLICY tenant_isolation ON products
  USING (tenant_id = get_current_tenant_id());
```

---

## 5. Arquitetura de Autenticação

### Dois Contextos de Auth Separados

```
Contexto 1: Cliente Final (por tenant)
  Provider: NextAuth.js + Supabase Auth
  JWT payload: { sub, tenant_id, email, role: 'customer' }
  Scope: Pedidos, histórico, endereços do PRÓPRIO tenant

Contexto 2: Dono do Restaurante (admin)
  Provider: NextAuth.js
  JWT payload: { sub, tenant_id, role: 'owner' }
  Scope: Painel admin do SEU tenant (Epic 6)
```

### Fluxo JWT com Tenant

```
1. Login → POST /api/auth/signin (NextAuth)
2. NextAuth callback → lê x-tenant-id do header
3. JWT gerado: { ...userInfo, tenant_id }
4. Cada request autenticada → middleware valida tenant_id do JWT == tenant_id do subdomínio
5. Mismatch → 403 (prevenção de token reuse entre tenants)
```

---

## 6. Arquitetura de Pagamentos

### Fluxo PIX (Pagar.me)

```
Cliente → Checkout → POST /api/orders
  → Cria order no DB (status: pending_payment)
  → Pagar.me: criar cobrança PIX
  → Retorna QR Code + copy-paste code
  → Polling /api/orders/:id/status (10s interval)
  → Webhook Pagar.me → POST /api/webhooks/pagame
    → Valida assinatura HMAC
    → UPDATE orders SET status = 'payment_confirmed'
    → Supabase Realtime notifica frontend
    → Frontend: redireciona para tela de rastreio
```

### Fluxo Cartão (Pagar.me)

```
Cliente → Checkout → Pagar.me SDK (tokenização no browser)
  → Token do cartão nunca toca nosso servidor
  → POST /api/orders com card_token
  → Pagar.me processa + antifraude
  → Webhook → mesma lógica do PIX
```

### Segurança de Pagamentos

- **PCI DSS:** Pagar.me é PCI Level 1 — nós nunca armazenamos dados de cartão
- **Webhook validation:** HMAC-SHA256 com secret do Pagar.me
- **Idempotência:** `idempotency_key` em todas as chamadas à API do gateway

---

## 7. Arquitetura de Real-Time (Status do Pedido)

```
Supabase Realtime (WebSocket)

Restaurante atualiza status → UPDATE orders SET status = 'preparing'

Supabase Realtime → broadcast change para channel 'order:{order_id}'

Cliente está subscrito:
  supabase.channel('order:abc123')
    .on('postgres_changes', { table: 'orders', filter: 'id=abc123' }, handleStatusChange)
    .subscribe()

Frontend → anima progresso na tela
Frontend → trigger notificação push (PWA Service Worker)
```

### Estados do Pedido

```
pending_payment → payment_confirmed → preparing → ready_for_pickup → out_for_delivery → delivered
                                                                                       → cancelled
```

---

## 8. Estrutura de Diretórios (Next.js App Router)

```
app/
├── (tenant)/                     # Route group — contexto de tenant
│   ├── layout.tsx                # Carrega config do tenant, injeta CSS vars
│   ├── page.tsx                  # Home: branding + cardápio
│   ├── menu/
│   │   └── [categoryId]/page.tsx
│   ├── cart/page.tsx
│   ├── checkout/page.tsx
│   ├── order/
│   │   └── [orderId]/page.tsx    # Rastreio em tempo real
│   └── account/
│       ├── login/page.tsx
│       └── orders/page.tsx
├── api/
│   ├── tenant/config/route.ts    # GET tenant branding (público, cached)
│   ├── products/route.ts
│   ├── orders/
│   │   ├── route.ts              # POST criar pedido
│   │   └── [id]/status/route.ts
│   ├── auth/[...nextauth]/route.ts
│   └── webhooks/
│       └── pagame/route.ts       # Webhook Pagar.me
├── middleware.ts                 # Tenant resolution (edge runtime)
└── design-system/                # Tokens CSS/TS (ds-token-architect)
    ├── tokens.json
    ├── components.map.json
    └── exports/
        ├── tokens.css
        └── tokens.ts

lib/
├── tenant/
│   ├── resolver.ts               # getTenantFromHostname()
│   └── context.ts                # getTenantId() server-side helper
├── supabase/
│   ├── server.ts                 # Client SSR com tenant_id
│   └── client.ts                 # Client browser
├── auth/
│   └── config.ts                 # NextAuth config com tenant_id no JWT
└── payments/
    └── pagame.ts                 # Wrapper Pagar.me SDK
```

---

## 9. Estratégia de Cache

| Dado | Cache | TTL | Estratégia |
|------|-------|-----|------------|
| Config do tenant (branding) | Vercel Edge + CDN | 5 min | `Cache-Control: s-maxage=300` |
| Cardápio (produtos) | React Query | 2 min | `staleTime: 120_000` |
| Status do pedido | Sem cache | — | Supabase Realtime (WebSocket) |
| Auth session | Cookie seguro | 30 dias | NextAuth session strategy |
| Imagens de produtos | Cloudflare CDN | 30 dias | R2 + Cache-Control imutável |

---

## 10. Estratégia de Deploy

### Ambientes

```
local          → next dev + supabase local (Docker)
staging        → Vercel Preview + Supabase projeto staging
production     → Vercel Production + Supabase projeto prod
```

### Pipeline CI/CD (a ser configurado por `@devops`)

```
push → branch → Vercel Preview Deploy (auto)
PR merged → main → Vercel Production Deploy (auto)
                 → supabase db push (migrations auto via GitHub Action)
```

### Domínios Customizados (Vercel)

```
Wildcard: *.plataforma.com → configurado no Vercel
CNAME do restaurante → plataforma.com → Cloudflare proxy → Vercel
Vercel lê Host header → Next.js Middleware resolve tenant
```

---

## 11. Segurança

| Camada | Controle |
|--------|---------|
| **Network** | Cloudflare DDoS protection + WAF básico |
| **Auth** | JWT com tenant_id + HTTPS only + cookies HttpOnly/Secure |
| **API** | Rate limiting via Vercel Edge Middleware (100 req/min por IP) |
| **Database** | RLS em todas as tabelas multi-tenant; connection pooling via Supabase |
| **Pagamentos** | Pagar.me PCI L1; HMAC webhook validation; sem dados de cartão no servidor |
| **Input** | Validação com Zod em todas as API routes e Server Actions |
| **Imagens** | Upload direto para R2 via presigned URL; sem proxy pelo servidor |

---

## 12. Decisões Pendentes / Delegadas

| Decisão | Responsável | Urgência |
|---------|-------------|---------|
| Schema detalhado (DDL, indexes, RLS policies) | `@data-engineer` | Story 1.1 |
| Design System tokens (cores, tipografia) | `ds-token-architect` (`.cursor/rules/`) | Story 2.x |
| Estratégia de notificação push (PWA vs nativo) | `@architect` (próxima iteração) | Story 4.x |
| Limites de rate limiting por plano SaaS | `@pm` | Story 3.x |

---

## 13. NFRs Atendidos

| NFR | Como |
|-----|------|
| **Performance:** home < 3s em 4G | RSC + SSG para cardápio; Cloudflare CDN para imagens |
| **Isolamento multi-tenant** | RLS PostgreSQL + validação tenant_id no JWT |
| **Disponibilidade 99.9%** | Vercel (SLA 99.99%) + Supabase (SLA 99.9%) |
| **Escalabilidade** | Vercel serverless escala auto; Supabase connection pooler (PgBouncer) |
| **Segurança PCI** | Pagar.me PCI L1; dados de cartão nunca tocam nossos servidores |
| **LGPD** | Dados de clientes isolados por tenant; política de retenção a implementar (Fase 2) |

---

## Histórico de Revisões

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0.0 | 2026-04-01 | Aria (Architect) | Arquitetura inicial — stack completa + estratégia multi-tenant |
