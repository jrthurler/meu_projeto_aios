# Epic 1 — Core Platform

**Status:** In Progress (1/4 stories Done)
**Prioridade:** P0 — Bloqueante para todo o MVP
**Fase:** MVP
**PRD de origem:** `docs/prd/delivery-platform.md`
**Criado por:** Morgan (PM) — 2026-04-01

---

## Epic Goal

Construir a infraestrutura multi-tenant que permite que múltiplos restaurantes coexistam na plataforma com isolamento completo de dados, branding próprio e roteamento por subdomínio — sem nenhuma interferência entre tenants.

> **Por que P0:** Sem este epic, nenhum outro epic pode ser desenvolvido. O Core Platform é a fundação sobre a qual cardápio, pedidos e rastreio serão construídos.

---

## Existing System Context

- **Stack atual:** Nenhuma (projeto greenfield)
- **Padrões a seguir:** A definir pelo `@architect` antes de iniciar Story 1.1
- **Integration points:** Todos os epics subsequentes dependem das interfaces definidas aqui

> **⚠️ Pré-requisito:** `@architect` deve definir a estratégia de multi-tenancy (row-level isolation vs schema-per-tenant) antes do início da Story 1.1. Esta decisão impacta toda a arquitetura de dados do projeto.

---

## Enhancement Details

### O que será construído

1. **Infraestrutura multi-tenant** — banco de dados com isolamento por tenant (RLS ou schema separado), configuração de tenant, seed de dados iniciais
2. **Roteamento por subdomínio** — `nomedorestaurante.plataforma.com` resolve para o tenant correto; suporte a domínio customizado via CNAME
3. **Autenticação de clientes** — login/cadastro do cliente final com contexto de tenant (cliente do restaurante A não é o mesmo do restaurante B)
4. **Branding por tenant** — carregamento dinâmico de logo, cor primária, nome e banner do tenant via API

### Como integra com os demais epics

```
Epic 1 (Core Platform)
    ↓ fornece: tenant_id, auth context, tenant config
Epic 2 (Catálogo)     — usa tenant_id para isolar cardápios
Epic 3 (Checkout)     — usa auth context para associar pedidos ao cliente
Epic 4 (Rastreio)     — usa tenant_id para filtrar notificações
Epic 5 (Onboarding)   — usa tenant config para setup inicial
```

---

## Stories

### Story 1.1 — Infraestrutura Multi-Tenant e Banco de Dados

```yaml
executor: "@data-engineer"
quality_gate: "@architect"
quality_gate_tools: [schema_validation, rls_policy_test, tenant_isolation_test]
risco: HIGH
```

**Descrição:** Definir e implementar o modelo de dados multi-tenant. Criar schema base com suporte a isolamento por tenant. Implementar RLS (Row Level Security) garantindo que queries de um tenant nunca retornem dados de outro.

**Acceptance Criteria:**
- [x] Tabela `tenants` criada com campos: id, slug, nome, dominio_customizado, config (JSONB), ativo, criado_em
- [x] RLS ativo em todas as tabelas com política `tenant_id = get_current_tenant_id()`
- [x] Função `get_current_tenant_id()` disponível — `SET LOCAL app.current_tenant_id = '<uuid>'`
- [x] Seed de 2 tenants de teste (restaurante-a, restaurante-b) sem interferência de dados
- [x] Teste de isolamento: query de restaurante-a retorna zero registros de restaurante-b ✅ AC7 PASSOU

**Quality Gates:**
- Pre-Commit: Validação de schema, verificação de RLS em todas as tabelas
- Pre-PR: `@architect` revisa estratégia de isolamento, migration safety check

**Executor Assignment Rationale:** Schema design + RLS = domínio de `@data-engineer`. Review por `@architect` pois define fundação técnica de todo o projeto.

---

### Story 1.2 — Roteamento Multi-Tenant por Subdomínio

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [routing_test, tenant_resolution_test, domain_mapping_test]
risco: HIGH
```

**Descrição:** Implementar middleware de resolução de tenant a partir do subdomínio da requisição. Configurar DNS wildcard para `*.plataforma.com`. Suportar domínio customizado via header `X-Forwarded-Host` ou CNAME lookup.

**Acceptance Criteria:**
- [ ] Middleware resolve `nomedorestaurante.plataforma.com` → `tenant_id` correto
- [ ] Tenant não encontrado retorna 404 com página de erro amigável
- [ ] Domínio customizado (`delivery.restaurante.com.br`) é mapeado corretamente via tabela `tenant_domains`
- [ ] Context de tenant injetado em todas as requisições (disponível via `request.tenant`)
- [ ] Teste: 2 subdomínios distintos retornam configurações distintas sem cross-contamination

**Quality Gates:**
- Pre-Commit: Teste de resolução de tenant, validação de edge cases (slug inválido, tenant inativo)
- Pre-PR: `@architect` valida padrão de middleware adotado

**Depends on:** Story 1.1 (tabela `tenants` deve existir)

---

### Story 1.3 — Autenticação de Cliente por Tenant

```yaml
executor: "@dev"
quality_gate: "@architect"
quality_gate_tools: [auth_isolation_test, jwt_validation, session_scope_test]
risco: HIGH
```

**Descrição:** Implementar autenticação do cliente final com escopo de tenant. Um cliente pode ter conta no restaurante A e conta independente no restaurante B. JWT deve conter `tenant_id` para garantir que tokens não sejam reutilizados entre tenants.

**Acceptance Criteria:**
- [ ] Cadastro de cliente associado ao `tenant_id` da requisição
- [ ] Login gera JWT com `{ user_id, tenant_id, exp }`
- [ ] Token de restaurante_a é inválido em restaurante_b (validação de `tenant_id` no JWT)
- [ ] Fluxo: cadastro → verificação de e-mail → login → token
- [ ] Rota protegida retorna 401 se token ausente ou 403 se tenant_id não bate
- [ ] Suporte a login social opcional (Google) — desacoplado para não bloquear MVP

**Quality Gates:**
- Pre-Commit: Testes de autenticação, validação de JWT com tenant_id errado
- Pre-PR: `@architect` valida fluxo de auth, revisão de segurança básica (OWASP A07)

**Depends on:** Story 1.1 (schema de usuários), Story 1.2 (tenant context disponível)

---

### Story 1.4 — API de Configuração e Branding do Tenant

```yaml
executor: "@dev"
quality_gate: "@dev"
quality_gate_tools: [api_contract_test, branding_rendering_test, cache_validation]
risco: MEDIUM
```

**Descrição:** Criar endpoint público `GET /api/tenant/config` que retorna as configurações de branding do tenant resolvido pelo subdomínio. Usado pelo frontend para carregar logo, cor, nome e banner sem autenticação.

**Acceptance Criteria:**
- [ ] `GET /api/tenant/config` retorna: `{ nome, logo_url, cor_primaria, banner_url, horario_funcionamento, status }`
- [ ] Response tem cache de 5 minutos (Cache-Control ou Redis)
- [ ] Tenant inativo retorna `{ status: "closed", message: "..." }`
- [ ] Imagens servidas via CDN (não base64 inline)
- [ ] Teste: 2 tenants retornam configs distintas sem autenticação

**Quality Gates:**
- Pre-Commit: Teste de contrato de API, verificação de cache headers
- Pre-PR: Revisão de performance (sem N+1 queries)

**Depends on:** Story 1.1 (tabela `tenants` com campos de config)

---

## Compatibility Requirements

> Este é um projeto greenfield — não há sistema legado a proteger. As "compatibility requirements" se aplicam entre as próprias stories do epic:

- [ ] RLS implementado na Story 1.1 **deve ser respeitado** por todas as queries das stories 1.2, 1.3, 1.4
- [ ] O `tenant_id` no JWT (Story 1.3) **deve coincidir** com o tenant resolvido pelo middleware (Story 1.2)
- [ ] API pública (Story 1.4) **não deve expor** dados sensíveis do tenant (credenciais de pagamento, dados de clientes)

---

## Risk Mitigation

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Vazamento de dados entre tenants | Baixa | Crítico | RLS validado com testes de isolamento antes de qualquer dado real |
| Decisão de arquitetura atrasada (@architect) | Média | Alto | Story 1.1 bloqueada até decisão formal documentada |
| JWT com tenant_id errado aceito | Baixa | Alto | Validação dupla: middleware + verificação no token |
| Performance ruim no roteamento | Baixa | Médio | Cache de resolução de tenant por subdomínio (TTL 1min) |

**Rollback Plan:**
- Stories 1.1-1.4 são base — se algo der errado, drop das tabelas e recriação é seguro (dados só de teste)
- Feature flag `MULTI_TENANT_ENABLED=false` pode desativar isolamento para debug local

---

## Definition of Done

- [ ] Todas as 4 stories com acceptance criteria 100% atendidos
- [ ] Testes de isolamento passando (tenant_a não acessa dados de tenant_b)
- [ ] `@architect` revisou e aprovou Stories 1.1, 1.2, 1.3
- [ ] Documentação de API (Story 1.4) atualizada
- [ ] Epic 2 (Catálogo) pode iniciar sem bloqueios técnicos

---

## Handoff para @sm

> **Mensagem para o Story Manager (@sm):**

"Por favor, desenvolva as stories detalhadas para o Epic 1 — Core Platform. Considerações importantes:

- **Projeto greenfield** — sem sistema legado, mas a ordem das stories é crítica (1.1 → 1.2 → 1.3 → 1.4)
- **Decisão de arquitetura pendente:** `@architect` deve definir row-level isolation vs schema-per-tenant antes de Story 1.1 iniciar
- **Integration points críticos:** tenant_id e auth context produzidos neste epic são consumidos por todos os outros epics
- **Cada story deve incluir verificação** de isolamento multi-tenant antes de ser marcada como Done

O epic estabelece a fundação segura sobre a qual o restante do MVP será construído."

---

## Validação do Epic

| # | Critério | Status |
|---|----------|--------|
| 1 | Goal claro e alcançável | ✅ |
| 2 | Stories bem delimitadas (≤5) | ✅ 4 stories |
| 3 | Executor ≠ Quality Gate em cada story | ✅ |
| 4 | Dependências entre stories mapeadas | ✅ |
| 5 | Riscos identificados e mitigados | ✅ |
| 6 | Critérios de Done mensuráveis | ✅ |
| 7 | Handoff para @sm preparado | ✅ |
| 8 | Alinhado com PRD seção 11 | ✅ |

**Score: 8/8 — Epic aprovado para criação de stories.**
