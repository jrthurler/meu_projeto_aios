# PRD — Plataforma Multi-Tenant de Delivery White-Label

**Versão:** 1.0.0
**Status:** Draft
**Data:** 2026-04-01
**Autor:** Morgan (PM)
**Stakeholders:** jrthurler

---

## 1. Visão do Produto

### Declaração de Visão

> **Permitir que qualquer restaurante tenha seu próprio app de delivery com identidade visual própria, sem pagar comissão por pedido — e sem cobrar taxas abusivas dos clientes.**

### O Problema

Os marketplaces de delivery dominantes (iFood, Rappi) cobram **12% a 30% de comissão** por pedido dos restaurantes, além de taxas de serviço para os clientes. Isso gera:

- **Para o restaurante:** erosão de margem, dependência de plataforma, perda de dados dos próprios clientes e impossibilidade de fidelização direta.
- **Para o cliente:** taxas de serviço ocultas que encarecem o pedido em 8%-15%.
- **Para o mercado:** restaurantes pequenos e médios não conseguem competir por visibilidade paga dentro dos marketplaces.

### A Solução

Uma plataforma SaaS multi-tenant onde:
- **Cada restaurante** tem seu próprio app (ou PWA) com branding próprio, domínio customizável e cardápio gerenciado.
- **O restaurante paga assinatura fixa** — sem comissão por pedido.
- **O cliente paga apenas taxa de entrega** — que pode ser gratuita acima de um valor mínimo configurado pelo restaurante.

---

## 2. Usuários-Alvo

### Persona 1 — O Restaurante (B2B)

| Atributo | Detalhe |
|----------|---------|
| **Perfil** | Dono ou gerente de restaurante pequeno/médio |
| **Dor principal** | Perde 15-30% de margem em cada pedido via marketplace |
| **Desejo** | Ter delivery próprio sem precisar de time técnico |
| **Comportamento** | Usa iFood/Rappi por falta de alternativa, não por preferência |
| **Critério de decisão** | Custo fixo previsível, setup simples, não precisar de app nativo próprio |

### Persona 2 — O Cliente Final (B2C via B2B)

| Atributo | Detalhe |
|----------|---------|
| **Perfil** | Consumidor habitual de delivery, 25-45 anos |
| **Dor principal** | Taxa de serviço + taxa de entrega = pedido muito mais caro |
| **Desejo** | Pedir no restaurante favorito sem pagar taxas extras |
| **Comportamento** | Acessa link/QR code indicado pelo restaurante |
| **Critério de decisão** | Experiência simples, confiança no pagamento, rastreio do pedido |

---

## 3. Proposta de Valor

| Para quem | Proposta |
|-----------|----------|
| **Restaurante** | "Seu delivery, sua marca, sem comissão. Pague um plano fixo e fique com 100% da receita dos pedidos." |
| **Cliente** | "Peça direto no restaurante. Sem taxa de serviço. Frete grátis acima de R$X." |

---

## 4. Features do MVP

> **Escopo MVP:** Somente a experiência do cliente final. O restaurante configura seu tenant via painel administrativo básico (não faz parte da jornada de delivery MVP, mas é pré-requisito técnico para o app funcionar).

### 4.1 Tenant Landing (Home do App)

- Carregamento do branding do tenant (logo, cor primária, banner)
- Roteamento por subdomínio: `nomedorestaurante.plataforma.com`
- Suporte a domínio customizado: `delivery.nomedorestaurante.com.br`
- Exibição de horário de funcionamento e status (aberto/fechado)

### 4.2 Cardápio

- Listagem de categorias e produtos com foto, nome, descrição e preço
- Filtro por categoria
- Busca por nome de produto
- Indicador de disponibilidade (produto ativo/inativo)
- Customizações de produto (ex: tamanho, adicionais, observação)

### 4.3 Carrinho

- Adicionar / remover itens
- Alterar quantidade
- Exibição de subtotal em tempo real
- Cálculo de taxa de entrega (com regra de frete grátis acima de valor mínimo configurado pelo tenant)
- Resumo do pedido antes de confirmar

### 4.4 Checkout e Pagamento

- Coleta de endereço de entrega (CEP + complemento)
- Validação de área de entrega do tenant
- Formas de pagamento: **PIX** (geração de QR Code) e **Cartão de crédito/débito**
- Integração com gateway de pagamento (Stripe ou Pagar.me)
- Confirmação de pedido com número único

### 4.5 Acompanhamento de Pedido

- Tela de status do pedido em tempo real (recebido → em preparo → saiu para entrega → entregue)
- Notificação por push (PWA) ou SMS nas transições de status
- Estimativa de tempo de entrega

### 4.6 Histórico de Pedidos

- Lista de pedidos anteriores
- Repetir pedido com um clique

---

## 5. Features Fora do MVP (Backlog)

| Feature | Justificativa de exclusão do MVP |
|---------|----------------------------------|
| Painel completo do restaurante | Necessário para onboarding, mas não para a experiência do cliente |
| Gestão de entregadores (próprios) | Complexidade operacional — MVP assume entrega terceirizada ou própria manual |
| Programa de fidelidade / cashback | Alavanca de retenção para fase 2 |
| Avaliações e reviews | Importante para prova social, não bloqueador do MVP |
| Analytics para o restaurante | Valor alto, baixa urgência no MVP |
| App nativo iOS/Android | PWA é suficiente para validação do MVP |
| Múltiplas unidades por tenant | Complexidade de roteamento — fase 2 |

---

## 6. Arquitetura Multi-Tenant (Diretrizes de Produto)

> Decisão técnica final é responsabilidade do `@architect`. Este PRD define os requisitos de produto que a arquitetura deve atender.

### Requisitos de isolamento

- Dados de pedidos, cardápio e clientes de um tenant **não podem ser acessíveis por outro tenant**
- Cada tenant deve ter **URL única e identidade visual própria**
- Configurações do tenant (frete, pagamento, horário) são **independentes**

### Requisitos de escala

- Plataforma deve suportar **múltiplos tenants simultâneos** sem degradação de performance
- Onboarding de novo tenant deve ser **self-service** (sem intervenção manual de engenharia)

### Roteamento sugerido

```
Opção A: Subdomínio padrão   → nomedorestaurante.plataforma.com
Opção B: Domínio customizado → delivery.nomedorestaurante.com.br (CNAME)
```

---

## 7. Monetização SaaS

| Plano | Preço/mês | Pedidos/mês | Domínio custom | Integrações |
|-------|-----------|-------------|----------------|-------------|
| **Starter** | R$99 | até 200 | Não | PIX apenas |
| **Pro** | R$249 | até 1.000 | Sim | PIX + Cartão |
| **Scale** | R$599 | ilimitado | Sim | PIX + Cartão + Whatsapp |

> **Modelo de receita:** 100% recorrente (MRR). Zero comissão por pedido. Zero taxa ao cliente final.

---

## 8. Métricas de Sucesso

### Métricas de Negócio (6 meses pós-lançamento)

| Métrica | Meta |
|---------|------|
| Tenants ativos (restaurantes) | 50 |
| MRR | R$15.000 |
| Churn mensal de tenants | < 5% |
| GMV total na plataforma | R$500k |

### Métricas de Produto (por tenant)

| Métrica | Meta |
|---------|------|
| Ticket médio por pedido | R$65 |
| Taxa de conversão (visita → pedido) | > 35% |
| NPS do cliente final | > 50 |
| Pedidos repetidos (retenção) | > 40% em 30 dias |

---

## 9. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Aquisição lenta de restaurantes | Alta | Alto | Estratégia de GTM focada em indicação + parceria com associações de restaurantes |
| Logística de entrega não resolvida | Média | Alto | MVP permite entregadores próprios do restaurante; fase 2 integra com Lalamove/99 |
| Concorrência de iFood/Rappi reagindo | Baixa | Médio | Nicho B2B SaaS é diferente de marketplace — não competição direta |
| Restaurante não adere ao digital | Média | Médio | Onboarding assistido nos primeiros clientes; simplificar ao máximo o setup |
| Fraude em pagamentos | Baixa | Alto | Gateway com antifraude (Stripe Radar / Pagar.me) desde o início |

---

## 10. Premissas e Dependências

### Premissas

- Restaurantes já têm cardápio digital (foto + preço) ou aceitam montar durante onboarding
- Entrega é responsabilidade do restaurante no MVP (motoboys próprios ou apps de logística)
- PIX e cartão cobrem 95%+ das formas de pagamento relevantes no Brasil

### Dependências Externas

- Gateway de pagamento: Stripe (internacional) ou Pagar.me (nacional, recomendado para BR)
- Serviço de SMS/notificação: Twilio ou Zenvia
- CDN para imagens de cardápio: Cloudflare R2 ou AWS S3

---

## 11. Critérios de Go/No-Go do MVP

O MVP está pronto para lançamento quando **todos** os critérios abaixo forem atendidos:

### Critérios Técnicos (obrigatórios)

| Critério | Condição de aprovação |
|----------|----------------------|
| Fluxo end-to-end funcional | Cliente consegue: entrar no tenant → montar pedido → pagar (PIX e cartão) → receber confirmação → ver status em tempo real |
| Multi-tenant isolado | 2+ tenants ativos sem vazamento de dados entre eles |
| Pagamento sem erro | 10 transações de teste (5 PIX + 5 cartão) sem falha crítica |
| Rastreio funcional | Mudanças de status refletem em < 5 segundos na tela do cliente |
| Performance mínima | Tempo de carregamento da home do tenant < 3s em 4G |

### Critérios de Negócio (obrigatórios)

| Critério | Condição de aprovação |
|----------|----------------------|
| Tenant piloto configurado | Ao menos 1 restaurante real configurado com cardápio real |
| Pedidos reais processados | Mínimo 10 pedidos pagos e entregues com sucesso |
| NPS inicial | Feedback positivo de ao menos 7 dos 10 primeiros clientes reais |

### Critérios de Saída (go/no-go decision)

- **GO:** Todos os critérios técnicos + ao menos 2 de 3 critérios de negócio atendidos
- **NO-GO:** Qualquer critério técnico falhando, ou NPS < 5/10 primeiros clientes satisfeitos
- **GO condicional:** Critérios técnicos OK + apenas 1 critério de negócio atendido → lançar para lista de espera, não público geral

---

## 12. Timeline Estimado

> Estimativas baseadas em time de 2-3 desenvolvedores full-stack. Sujeito a revisão após `@architect` definir a stack técnica.

```
Mês 1       Mês 2       Mês 3       Mês 4       Mês 5       Mês 6
│           │           │           │           │           │
├─ Epic 1 ──┤           │           │           │           │
│ Core       ├─ Epic 2 ─┤           │           │           │
│ Platform   │ Catálogo  ├─ Epic 3 ──┤           │           │
│            │ Cardápio  │ Pedido &  ├─ Epic 4 ──┤           │
│            │           │ Checkout  │ Rastreio  ├─ Epic 5 ──┤
│            │           │           │ Notif.    │ Onboarding│
│            │           │           │           │           ├─ LAUNCH
```

### Marcos Principais

| Marco | Prazo estimado | Entregável |
|-------|---------------|------------|
| **M1 — Fundação** | Fim do mês 1 | Infra multi-tenant rodando, roteamento por subdomínio, auth |
| **M2 — Cardápio** | Fim do mês 2 | Tenant com cardápio navegável pelo cliente |
| **M3 — Pedido funcional** | Fim do mês 3 | Fluxo completo de pedido + pagamento PIX |
| **M4 — Rastreio** | Fim do mês 4 | Status em tempo real + notificações |
| **M5 — Piloto fechado** | Fim do mês 5 | 1 restaurante real, 10 pedidos de teste |
| **M6 — Lançamento MVP** | Fim do mês 6 | Go/No-Go → lançamento público |

### Fase 2 (pós-MVP, meses 7-12)

- Epic 6: Painel completo do restaurante
- Integração com logística terceirizada (Lalamove, 99Moto)
- App nativo iOS/Android (se PWA validado)
- Analytics e programa de fidelidade

---

## 13. Epics Derivados

| # | Epic | Prioridade | Fase |
|---|------|-----------|------|
| 1 | **Core Platform** — Infraestrutura multi-tenant, roteamento, autenticação | P0 | MVP |
| 2 | **Catálogo e Cardápio** — CRUD de produtos, categorias, customizações | P0 | MVP |
| 3 | **Pedido e Checkout** — Carrinho, frete, pagamento PIX + cartão | P0 | MVP |
| 4 | **Rastreio e Notificações** — Status em tempo real, push/SMS | P1 | MVP |
| 5 | **Onboarding de Restaurante** — Wizard de setup do tenant | P1 | MVP |
| 6 | **Painel do Restaurante** — Gestão de pedidos e cardápio | P2 | Fase 2 |
| 7 | **Fidelidade e Analytics** — Programa de pontos, dashboard | P3 | Fase 3 |

---

## Histórico de Revisões

| Versão | Data | Autor | Mudança |
|--------|------|-------|---------|
| 1.0.0 | 2026-04-01 | Morgan (PM) | Versão inicial |
| 1.1.0 | 2026-04-01 | Morgan (PM) | Adicionadas seções 11 (Go/No-Go) e 12 (Timeline) |
