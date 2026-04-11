# Brownfield Architecture Document — Plataforma Multi-Tenant de Delivery

**Versão:** 1.0.0
**Status:** Current State (Brownfield)
**Data:** 2026-04-11
**Autor:** Aria (@architect)
**PRD de origem:** `docs/prd/delivery-platform.md` v1.1.0

> **AVISO:** Este documento captura o **estado real atual** do sistema — incluindo dívidas técnicas, workarounds e inconsistências. Não é um documento aspiracional.

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-04-11 | 1.0.0 | Análise brownfield inicial | Aria (@architect) |

---

## Quick Reference — Arquivos Críticos

| Responsabilidade | Arquivo |
|-----------------|---------|
| Resolução de tenant (middleware) | `middleware.ts` |
| Configuração de tenant | `lib/tenant/config.ts` |
| Resolver de hostname → tenant | `lib/tenant/resolver.ts` |
| Horários de funcionamento | `lib/tenant/hours.ts` |
| Tipos do tenant | `lib/tenant/types.ts` |
| Configuração NextAuth | `lib/auth/config.ts` |
| Rate limiting auth | `lib/auth/rate-limit.ts` |
| Auth server-side | `lib/auth/server.ts` |
| Queries do catálogo | `lib/catalog/queries.ts` |
| Tipos do catálogo | `lib/catalog/types.ts` |
| Cart store (Zustand) | `lib/cart/store.ts` |
| Tipos do cart | `lib/cart/types.ts` |
| Supabase client (browser) | `lib/supabase/client.ts` |
| Supabase client (server) | `lib/supabase/server.ts` |
| Home do tenant (redirect) | `app/page.tsx` |
| Layout do tenant | `app/(tenant)/layout.tsx` |
| Cardápio (página) | `app/(tenant)/menu/page.tsx` |
| Login do cliente | `app/(tenant)/account/login/page.tsx` |
| API auth (NextAuth) | `app/api/auth/[...nextauth]/route.ts` |
| API signup | `app/api/auth/signup/route.ts` |
| API config do tenant | `app/api/tenant/config/route.ts` |
| API categorias | `app/api/catalog/categories/route.ts` |
| API produtos | `app/api/catalog/products/route.ts` |
| API produto por ID | `app/api/catalog/products/[id]/route.ts` |
| Componente menu (client) | `components/catalog/MenuClient.tsx` |
| Componente produto card | `components/catalog/ProductCard.tsx` |
| Componente modal produto | `components/catalog/ProductModal.tsx` |
| Componente busca | `components/catalog/SearchBar.tsx` |
| Navegação de categorias | `components/catalog/CategoryNav.tsx` |
| Botão do carrinho | `components/cart/CartButton.tsx` |

---

## 1. Visão Geral do Sistema

### Resumo

Plataforma SaaS multi-tenant de delivery white-label. Cada restaurante (tenant) tem seu próprio app com branding próprio, acessível via subdomínio (`restaurante.localhost:3000` em dev, `restaurante.plataforma.com` em prod). O cliente final acessa o cardápio, monta o pedido e paga sem pagar comissão à plataforma.

### Stack Real (confirmada via package.json)

| Camada | Tecnologia | Versão | Notas |
|--------|-----------|--------|-------|
| Framework | Next.js | ^16.2.2 | App Router + Turbopack |
| Runtime | Node.js | 18+ | Exigido pelo Next.js |
| Linguagem | TypeScript | ^6.0.2 | strict mode ativo |
| UI | Tailwind CSS | ^3.4.19 | **v3, não v4** (diverge da arquitetura) |
| Estado client | Zustand | ^5.0.12 | Carrinho |
| Auth | NextAuth.js | ^5.0.0-beta.30 | **Beta** — API instável |
| Database | Supabase JS | ^2.101.1 | PostgreSQL + RLS |
| Testes | Vitest | ^4.1.2 | |
| Criptografia | bcryptjs | ^3.0.3 | Senhas |

### Estrutura de Diretórios (real)

```
meu_projeto_aios/
├── app/
│   ├── (tenant)/               # Route group — contexto de tenant
│   │   ├── layout.tsx          # Header, branding, CartButton
│   │   ├── page.tsx            # Redirect para /menu se tenant resolvido
│   │   ├── menu/page.tsx       # Cardápio (Server Component)
│   │   └── account/login/      # Login do cliente
│   ├── api/
│   │   ├── auth/[...nextauth]/ # NextAuth handler
│   │   ├── auth/signup/        # Cadastro de cliente
│   │   ├── catalog/categories/ # GET categorias
│   │   ├── catalog/products/   # GET produtos + GET produto por ID
│   │   └── tenant/config/      # GET config pública do tenant
│   ├── not-found.tsx           # Página tenant não encontrado
│   ├── tenant-unavailable/     # Página tenant inativo
│   ├── globals.css
│   └── layout.tsx              # Layout raiz
├── components/
│   ├── cart/CartButton.tsx     # Botão do carrinho (client component)
│   └── catalog/
│       ├── MenuClient.tsx      # Shell client do cardápio
│       ├── ProductCard.tsx     # Card de produto
│       ├── ProductModal.tsx    # Modal de produto (customizações)
│       ├── CategoryNav.tsx     # Navegação por categoria
│       └── SearchBar.tsx       # Busca por nome
├── lib/
│   ├── auth/                   # NextAuth config, rate-limit, server helpers
│   ├── cart/                   # Zustand store + tipos
│   ├── catalog/                # Queries Supabase + tipos
│   ├── supabase/               # Clients browser/server
│   └── tenant/                 # Resolver, config, hours, tipos
├── supabase/
│   ├── migrations/             # 8 migrations (001–008)
│   ├── seed.sql                # Tenants de teste
│   └── tests/                  # Teste de isolamento AC7
├── tests/unit/                 # Vitest (5 suites)
├── docs/
│   ├── prd/                    # PRD v1.1.0
│   ├── architecture/           # Este doc + fullstack-architecture.md
│   ├── epics/                  # Epic 1 e Epic 2
│   └── stories/                # Stories 1.1–1.4 e 2.1–2.3
└── middleware.ts               # Tenant resolution (edge runtime)
```

---

## 2. Fluxo de Resolução de Tenant (IMPLEMENTADO)

### Como funciona hoje

```
Request: restaurante-a.localhost:3000/

1. middleware.ts (edge runtime)
   a. Extrai hostname da request (ex: "restaurante-a.localhost:3000")
   b. Normaliza: remove porta → "restaurante-a.localhost"
   c. Verifica se é domínio raiz → retorna null (página padrão)
   d. Se termina com ".localhost" → extrai slug "restaurante-a"
   e. Query Supabase: SELECT id, slug, nome, ativo FROM tenants WHERE slug = 'restaurante-a'
   f. Cache em memória (Map) com TTL de 60s
   g. Tenant não encontrado → rewrite para /not-found
   h. Tenant inativo → rewrite para /tenant-unavailable
   i. Tenant válido → injeta headers: x-tenant-id, x-tenant-slug
   j. Rotas protegidas (/api/orders): valida JWT.tenant_id == x-tenant-id

2. Server Components leem x-tenant-id via headers()

3. getTenantConfig() busca config completa incluindo config JSONB
   (CORREÇÃO APLICADA: antes buscava colunas inexistentes frete_base, etc.)
```

### Arquivo chave: `middleware.ts`

**GOTCHA CRÍTICO:** O middleware usa `SUPABASE_SERVICE_ROLE_KEY` para resolver tenants — necessário para bypassar RLS (tabela `tenants` não tem RLS). Nunca expor essa key no client.

---

## 3. Banco de Dados (IMPLEMENTADO)

### Migrations aplicadas no Supabase (remoto)

| Migration | Conteúdo |
|-----------|---------|
| 001_extensions_and_enums | uuid-ossp, pg_trgm, unaccent + enums: plano_saas, order_status, payment_method, payment_status, notification_channel |
| 002_helper_functions | get_current_tenant_id() via current_setting('app.current_tenant_id') |
| 003_core_tables | tenants, tenant_users, product_categories, products, orders, order_items, notifications |
| 004_triggers | set_atualizado_em, validate_order_total, record_order_status_transition |
| 005_rls_policies | RLS em: tenant_users, product_categories, products, orders, order_items, notifications |
| 006_indexes | idx_tenants_slug, idx_tenants_custom_domain, GIN search, demais índices |
| 007_grants | Grants para roles anon e authenticated |
| 008_catalog_seed | Seed de categorias e produtos para restaurante-a (pizzaria) e restaurante-b (hamburgueria) |

### Dívida técnica de banco (documentada em Story 1.1)

| Severidade | Problema | Onde corrigir |
|-----------|---------|---------------|
| HIGH | Policy conflict: `FOR ALL` + `FOR SELECT` em orders/tenant_users criam sobreposição | Story 1.3 |
| MEDIUM | INSERT grant ausente em order_items | Story 3.x |
| LOW | Campo `aceito_em` sem trigger de transição automática | Story 3.x |
| LOW | Índice GIN sem unaccent (busca não ignora acentos) | Habilitar via Supabase Dashboard |

### Tenants de teste (IDs fixos para dev)

```
restaurante-a: id = 11111111-1111-1111-1111-111111111111
restaurante-b: id = 22222222-2222-2222-2222-222222222222
```

---

## 4. Autenticação (PARCIALMENTE IMPLEMENTADO)

### Estado atual

- NextAuth.js v5 beta configurado em `lib/auth/config.ts`
- API route em `app/api/auth/[...nextauth]/route.ts`
- Rota de signup em `app/api/auth/signup/route.ts`
- Rate limiting em `lib/auth/rate-limit.ts` (protege POST /api/auth/signin)
- **Story 1.3 ainda não está Done** — autenticação pode estar incompleta

### GOTCHA — NextAuth v5 Beta

NextAuth 5.0.0-beta.30 tem API diferente do v4. Usar `auth()` do `lib/auth/server.ts`, não `getServerSession()`. A API pode mudar a qualquer patch.

---

## 5. Catálogo (IMPLEMENTADO — Story 2.2 e 2.3)

### Fluxo de dados

```
MenuPage (Server Component)
  → getCategories(tenantId)   — lib/catalog/queries.ts
  → getProducts(tenantId)     — lib/catalog/queries.ts
  → <MenuClient categorias produtos />  (Client Component)
      → CategoryNav (filtra por categoria)
      → SearchBar (filtra por nome, local)
      → ProductCard (exibe produto)
      → ProductModal (customizações + add to cart)
      → CartButton (header, state Zustand)
```

### Queries: `lib/catalog/queries.ts`

- `getCategories(tenantId)` — categorias ativas, ordenadas por `ordem`
- `getProducts(tenantId, { categoriaId?, query? })` — produtos disponíveis, suporte a busca ILIKE
- `getProductById(tenantId, productId)` — produto individual com validação de tenant

**Todas usam `service_role` para bypassar RLS** — filtro manual por `tenant_id` no código.

---

## 6. Carrinho (IMPLEMENTADO)

- Estado em Zustand store: `lib/cart/store.ts`
- Persiste apenas em memória (sem localStorage ainda)
- Tipos em `lib/cart/types.ts`
- `CartButton` no header mostra quantidade de itens

**Dívida:** Carrinho não persiste entre recarregamentos de página.

---

## 7. Dívidas Técnicas e Workarounds Conhecidos

### Críticos (bloqueia features futuras)

| # | Problema | Impacto | Arquivo |
|---|---------|---------|---------|
| 1 | `middleware.ts` usa arquivo deprecated (Next.js avisa: use "proxy" em vez de "middleware") | Warning no log, pode quebrar em Next.js 17+ | `middleware.ts` |
| 2 | Story 1.3 (auth por tenant) não está Done — JWT com tenant_id pode não estar validando corretamente | Segurança | Stories 1.3, 1.4 |
| 3 | Policy conflict RLS em orders/tenant_users | Vazamento de dados potencial | Migration 005 |

### Médios (devem ser resolvidos antes do MVP)

| # | Problema | Impacto | Arquivo |
|---|---------|---------|---------|
| 4 | Tailwind v3 instalado (arquitetura define v4) | CSS vars de branding podem não funcionar como esperado | `tailwind.config.ts` |
| 5 | Carrinho não persiste no localStorage | UX ruim — itens sumem ao recarregar | `lib/cart/store.ts` |
| 6 | `lib/tenant/config.ts` — fix manual aplicado hoje (config JSONB) | Estava causando crash silencioso | `lib/tenant/config.ts` |
| 7 | Sem ESLint configurado | Qualidade de código sem automação | Raiz do projeto |
| 8 | Sem Prettier configurado | Formatação inconsistente | Raiz do projeto |
| 9 | Sem CI/CD (GitHub Actions) | Deploy manual, sem gate de qualidade automático | `.github/` |

### Baixos (backlog)

| # | Problema | Impacto |
|---|---------|---------|
| 10 | Cache do tenant em memória (não persiste entre deploys Vercel) | Cada instância tem cache próprio |
| 11 | Busca com ILIKE (sem full-text) | Busca não ignora acentos |
| 12 | Sem shadcn/ui instalado (arquitetura prevê) | Componentes custom sem padrão de design system |

---

## 8. Stories e Estado Atual

### Epic 1 — Core Platform

| Story | Título | Status |
|-------|--------|--------|
| 1.1 | Infraestrutura Multi-Tenant e Banco de Dados | **Done** ✅ |
| 1.2 | Roteamento Multi-Tenant por Subdomínio | **Done** ✅ (código presente, AC validados) |
| 1.3 | Autenticação de Cliente por Tenant | **In Progress** (código presente, ACs pendentes) |
| 1.4 | API de Configuração e Branding do Tenant | **In Progress** (API presente, cache não implementado) |

### Epic 2 — Catálogo e Cardápio

| Story | Título | Status |
|-------|--------|--------|
| 2.1 | Seed Data do Catálogo | **Ready** (migration criada, não aplicada no remoto) |
| 2.2 | APIs do Catálogo | **In Progress** (APIs presentes) |
| 2.3 | UI do Cardápio | **In Progress** (componentes presentes) |

### Epics Não Iniciados

- Epic 3 — Pedido e Checkout
- Epic 4 — Rastreio e Notificações
- Epic 5 — Onboarding de Restaurante

---

## 9. Ambiente e Configuração

### Variáveis de ambiente (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=https://qyvivlojyriocvighxio.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...          # NUNCA expor no client
NEXT_PUBLIC_BASE_DOMAIN=localhost      # Em prod: plataforma.com
AUTH_SECRET=...                         # NextAuth secret
```

### Comandos de desenvolvimento

```bash
npm run dev          # Next.js dev (Turbopack) — porta 3000
npm run build        # Build de produção
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
npm run lint         # Next.js lint (ESLint não configurado — pode falhar)
```

### Acessar tenants localmente

Adicionar ao `C:\Windows\System32\drivers\etc\hosts`:
```
127.0.0.1   restaurante-a.localhost
127.0.0.1   restaurante-b.localhost
```

Acessar: `http://restaurante-a.localhost:3000`

---

## 10. Testes

### Suites existentes (`tests/unit/`)

| Arquivo | O que testa |
|---------|------------|
| `auth.test.ts` | Autenticação |
| `cart-store.test.ts` | Zustand cart store |
| `catalog-api.test.ts` | APIs do catálogo |
| `tenant-config.test.ts` | getTenantConfig() |
| `tenant-resolver.test.ts` | resolveTenantFromHostname() |

### Cobertura real

- Testes unitários: 5 suites (Vitest)
- Testes de integração: apenas `supabase/tests/isolation_test_ac7.sql`
- Testes E2E: **ausentes**
- Coverage % não medido

---

## 11. Próximos Passos Recomendados

Com base no estado atual, a sequência natural é:

1. **Fechar Stories 1.3 e 1.4** — completar auth por tenant e cache da API de config
2. **Aplicar migration 008** no Supabase remoto (Story 2.1 — seed do catálogo)
3. **Fechar Stories 2.2 e 2.3** — validar APIs e UI do cardápio com dados reais
4. **Adicionar ESLint + Prettier** — qualidade de código mínima antes de Epic 3
5. **Iniciar Epic 3** — Pedido e Checkout (maior complexidade: pagamentos, CEP, frete)

---

## 12. Referências

| Documento | Path |
|-----------|------|
| PRD | `docs/prd/delivery-platform.md` |
| Arquitetura Full-Stack | `docs/architecture/fullstack-architecture.md` |
| Schema do banco | `docs/architecture/database/schema.sql` |
| Migration plan | `docs/architecture/database/migration-plan.md` |
| Epic 1 | `docs/epics/epic-1-core-platform.md` |
| Epic 2 | `docs/epics/epic-2-catalogo.md` |
| Stories | `docs/stories/` |
