-- =============================================================================
-- Migration 002 — Funções Auxiliares
-- Story: 1.1 — Infraestrutura Multi-Tenant e Banco de Dados
-- =============================================================================

-- UP

-- Função helper: retorna tenant_id do contexto atual (usada nas policies RLS)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$;

COMMENT ON FUNCTION get_current_tenant_id() IS
  'Retorna tenant_id do contexto da requisição. Setado via: SET LOCAL app.current_tenant_id = ''<uuid>''.';

-- Função: atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

-- Função: valida que total do pedido = subtotal + frete - desconto
CREATE OR REPLACE FUNCTION validate_order_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.total != (NEW.subtotal + NEW.frete - NEW.desconto) THEN
    RAISE EXCEPTION 'order total inválido: total(%) != subtotal(%) + frete(%) - desconto(%)',
      NEW.total, NEW.subtotal, NEW.frete, NEW.desconto;
  END IF;
  RETURN NEW;
END;
$$;

-- Função: registra timestamps de transição de status do pedido
CREATE OR REPLACE FUNCTION record_order_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'payment_confirmed' THEN NEW.pago_em = now();
      WHEN 'preparing'         THEN NEW.preparando_em = now();
      WHEN 'ready_for_pickup'  THEN NEW.pronto_em = now();
      WHEN 'out_for_delivery'  THEN NEW.saiu_em = now();
      WHEN 'delivered'         THEN NEW.entregue_em = now();
      WHEN 'cancelled'         THEN NEW.cancelado_em = now();
      ELSE NULL;
    END CASE;
  END IF;
  RETURN NEW;
END;
$$;

-- ROLLBACK
-- DROP FUNCTION IF EXISTS record_order_status_transition();
-- DROP FUNCTION IF EXISTS validate_order_total();
-- DROP FUNCTION IF EXISTS set_atualizado_em();
-- DROP FUNCTION IF EXISTS get_current_tenant_id();
