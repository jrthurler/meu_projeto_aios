# Plano de Migration — Plataforma Multi-Tenant de Delivery

**Versão:** 1.0.0
**Autor:** Dara (@data-engineer)
**Data:** 2026-04-01
**Ambiente alvo:** Supabase (PostgreSQL 15+)

---

## Estratégia de Migration

Todas as migrations são **idempotentes** (seguras para reexecutar) e possuem **rollback documentado**.
Nomenclatura: `YYYYMMDDHHMMSS_descricao_curta.sql`

---

## Migration 001 — Extensões e Enums

**Arquivo:** `migrations/20260401000001_extensions_and_enums.sql`

```sql
-- UP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

CREATE TYPE plano_saas AS ENUM ('starter', 'pro', 'scale');
CREATE TYPE order_status AS ENUM (
  'pending_payment', 'payment_confirmed', 'preparing',
  'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled'
);
CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'debit_card');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'confirmed', 'failed', 'refunded');
CREATE TYPE notification_channel AS ENUM ('push', 'sms', 'whatsapp', 'email');

-- ROLLBACK
-- DROP TYPE IF EXISTS notification_channel;
-- DROP TYPE IF EXISTS payment_status;
-- DROP TYPE IF EXISTS payment_method;
-- DROP TYPE IF EXISTS order_status;
-- DROP TYPE IF EXISTS plano_saas;
```

**Risco:** Baixo. Extensões são idempotentes. Enums sem dependências.

---

## Migration 002 — Funções Auxiliares

**Arquivo:** `migrations/20260401000002_helper_functions.sql`

```sql
-- UP
CREATE OR REPLACE FUNCTION get_current_tenant_id() ...
CREATE OR REPLACE FUNCTION set_atualizado_em() ...
CREATE OR REPLACE FUNCTION validate_order_total() ...
CREATE OR REPLACE FUNCTION record_order_status_transition() ...

-- ROLLBACK
-- DROP FUNCTION IF EXISTS record_order_status_transition();
-- DROP FUNCTION IF EXISTS validate_order_total();
-- DROP FUNCTION IF EXISTS set_atualizado_em();
-- DROP FUNCTION IF EXISTS get_current_tenant_id();
```

**Risco:** Baixo. Funções com CREATE OR REPLACE são idempotentes.

---

## Migration 003 — Tabelas Core

**Arquivo:** `migrations/20260401000003_core_tables.sql`

**Ordem obrigatória** (FK constraints):
1. `tenants`
2. `tenant_users`
3. `product_categories`
4. `products`
5. `orders`
6. `order_items`
7. `notifications`

```sql
-- ROLLBACK (ordem inversa)
-- DROP TABLE IF EXISTS notifications;
-- DROP TABLE IF EXISTS order_items;
-- DROP TABLE IF EXISTS orders;
-- DROP TABLE IF EXISTS products;
-- DROP TABLE IF EXISTS product_categories;
-- DROP TABLE IF EXISTS tenant_users;
-- DROP TABLE IF EXISTS tenants;
```

**Risco:** Médio. Verificar FK antes de dropar em produção.

---

## Migration 004 — Triggers

**Arquivo:** `migrations/20260401000004_triggers.sql`

```sql
-- UP: criar triggers (ver schema.sql)

-- ROLLBACK
-- DROP TRIGGER IF EXISTS trg_orders_status_transition ON orders;
-- DROP TRIGGER IF EXISTS trg_orders_validate_total ON orders;
-- DROP TRIGGER IF EXISTS trg_orders_atualizado_em ON orders;
-- ... (demais triggers)
```

---

## Migration 005 — RLS Policies

**Arquivo:** `migrations/20260401000005_rls_policies.sql`

```sql
-- UP: ALTER TABLE ... ENABLE ROW LEVEL SECURITY + CREATE POLICY ...

-- ROLLBACK
-- DROP POLICY IF EXISTS "notifications: isolamento por tenant" ON notifications;
-- ... (todas as policies)
-- ALTER TABLE notifications  DISABLE ROW LEVEL SECURITY;
-- ... (demais tabelas)
```

**Risco:** Alto. Testar isolamento antes de habilitar em produção:
```sql
-- Teste de isolamento (rodar antes do deploy em produção)
SET LOCAL app.current_tenant_id = '<uuid-tenant-a>';
SELECT count(*) FROM orders; -- deve retornar apenas pedidos do tenant A

SET LOCAL app.current_tenant_id = '<uuid-tenant-b>';
SELECT count(*) FROM orders; -- deve retornar apenas pedidos do tenant B
```

---

## Migration 006 — Índices

**Arquivo:** `migrations/20260401000006_indexes.sql`

```sql
-- UP: CREATE INDEX ... (ver schema.sql)

-- ROLLBACK
-- DROP INDEX IF EXISTS idx_notifications_enviado;
-- DROP INDEX IF EXISTS idx_notifications_user_order;
-- ... (demais índices)
```

**Risco:** Baixo em tabelas vazias. Em produção com dados: usar `CREATE INDEX CONCURRENTLY`.

---

## Checklist de Deploy (Story 1.1)

### Pré-deploy

- [ ] Backup do banco (se staging com dados)
- [ ] Migrations testadas em banco local (`supabase db reset --local`)
- [ ] Teste de isolamento RLS executado e passando
- [ ] `supabase db diff` confirma apenas as mudanças esperadas

### Deploy

```bash
# Aplicar migrations em ordem
supabase db push --include-all

# Ou migration por migration
supabase migration up --version 20260401000001
supabase migration up --version 20260401000002
# ... continuar até 006
```

### Pós-deploy

- [ ] `SELECT * FROM pg_policies WHERE tablename = 'orders';` — confirmar policies ativas
- [ ] Teste de isolamento com 2 tenants reais
- [ ] Verificar que `get_current_tenant_id()` retorna NULL sem context (esperado)
- [ ] Trigger de validação de total: inserir pedido com total errado → deve falhar

---

## Notas de Segurança

1. **`pagamento_config` em `tenants`** — NUNCA armazenar API keys em plaintext. Usar `pgcrypto` + `encrypt()` na aplicação ou Supabase Vault.
2. **`service_role` key** — usado apenas no servidor (Next.js API Routes). NUNCA expor no frontend.
3. **`anon` key** — pode ser exposta no frontend. Acesso limitado pelo RLS.
4. **Connection pooling** — usar Supabase Pooler (PgBouncer) em modo `transaction` para serverless (Vercel).
