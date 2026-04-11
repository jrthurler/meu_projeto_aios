-- =============================================================================
-- Migration 001 — Extensões e Enums
-- Story: 1.1 — Infraestrutura Multi-Tenant e Banco de Dados
-- =============================================================================

-- UP
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

DO $$ BEGIN
  CREATE TYPE plano_saas AS ENUM ('starter', 'pro', 'scale');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'pending_payment',
    'payment_confirmed',
    'preparing',
    'ready_for_pickup',
    'out_for_delivery',
    'delivered',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'debit_card');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM (
    'pending',
    'processing',
    'confirmed',
    'failed',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('push', 'sms', 'whatsapp', 'email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ROLLBACK
-- DROP TYPE IF EXISTS notification_channel;
-- DROP TYPE IF EXISTS payment_status;
-- DROP TYPE IF EXISTS payment_method;
-- DROP TYPE IF EXISTS order_status;
-- DROP TYPE IF EXISTS plano_saas;
