# Epic 2 — Catálogo e Cardápio

**Status:** In Progress
**Prioridade:** P0 — Bloqueante para Epic 3 (Pedido e Checkout)
**Fase:** MVP
**PRD de origem:** `docs/prd/delivery-platform.md` §4.2
**Depende de:** Epic 1 — Core Platform (Done)
**Criado por:** River (@sm) — 2026-04-02

---

## Epic Goal

Permitir que o cliente final navegue pelo cardápio completo de um restaurante — veja categorias, produtos com foto e preço, filtre por categoria, busque por nome, veja customizações (tamanho, adicionais) e adicione itens ao carrinho — tudo isolado por tenant.

> **Por que P0:** Sem cardápio navegável, não há pedido. Epic 3 (Pedido e Checkout) depende do estado do carrinho criado aqui.

---

## Existing System Context

- **Tables:** `product_categories` e `products` já existem (Story 1.1)
- **RLS:** Políticas de isolamento por tenant já configuradas (Migration 005)
- **Auth:** `x-tenant-id` header injetado pelo middleware (Story 1.2)
- **TenantConfig:** `getTenantConfig()` disponível — frete e tempo de preparo usados no layout

---

## Stories

| Story | Título | Status | Pontos |
|-------|--------|--------|--------|
| 2.1 | Seed Data do Catálogo | Draft | 1 |
| 2.2 | APIs do Catálogo | Draft | 3 |
| 2.3 | UI do Cardápio | Draft | 5 |

**Total:** 9 pontos

---

## Definition of Done do Epic

- [ ] Tenant-A e Tenant-B têm cardápios distintos e navegáveis
- [ ] Filtro por categoria e busca por nome funcionando
- [ ] Customizações de produto visíveis no modal
- [ ] Carrinho (Zustand) funcional — pronto para Epic 3
- [ ] Todos os ACs das 3 stories verificados
- [ ] 0 campos de outro tenant vazando entre requests

---

## Change Log

| Data | Autor | Mudança |
|------|-------|---------|
| 2026-04-02 | River (@sm) | Epic criado |
