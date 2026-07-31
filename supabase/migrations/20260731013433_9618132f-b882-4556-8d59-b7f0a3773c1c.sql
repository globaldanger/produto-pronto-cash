-- =========================
-- CUSTOMERS
-- =========================
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cpf text,
  phone text,
  email text,
  cep text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  notes text,
  credit_limit numeric NOT NULL DEFAULT 0,
  user_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX customers_cpf_unique ON public.customers (cpf) WHERE cpf IS NOT NULL AND cpf <> '';
CREATE INDEX customers_name_idx ON public.customers (lower(name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view customers" ON public.customers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario') OR user_id = auth.uid());

CREATE POLICY "Staff can insert customers" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "Staff can update customers" ON public.customers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "Admins can delete customers" ON public.customers
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- CUSTOMER LEDGER (credit / fiado)
-- =========================
CREATE TABLE public.customer_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  kind text NOT NULL DEFAULT 'ajuste',
  description text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customer_ledger_customer_idx ON public.customer_ledger (customer_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_ledger TO authenticated;
GRANT ALL ON public.customer_ledger TO service_role;

ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view ledger" ON public.customer_ledger
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "Staff can insert ledger" ON public.customer_ledger
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "Admins can update ledger" ON public.customer_ledger
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ledger" ON public.customer_ledger
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- ORDERS: customer link, receipt + tracking fields
-- =========================
CREATE OR REPLACE FUNCTION public.gen_tracking_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := 'SC';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE tracking_code = code);
  END LOOP;
  RETURN code;
END;
$$;

ALTER TABLE public.orders
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN customer_cpf text,
  ADD COLUMN warranty_text text,
  ADD COLUMN warranty_days integer,
  ADD COLUMN tracking_code text;

UPDATE public.orders SET tracking_code = public.gen_tracking_code() WHERE tracking_code IS NULL;

ALTER TABLE public.orders ALTER COLUMN tracking_code SET DEFAULT public.gen_tracking_code();

CREATE UNIQUE INDEX orders_tracking_code_unique ON public.orders (tracking_code);
CREATE INDEX orders_customer_idx ON public.orders (customer_id);

-- =========================
-- TRACKING EVENTS
-- =========================
CREATE TABLE public.order_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  description text,
  location text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_tracking_events_order_idx ON public.order_tracking_events (order_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_tracking_events TO authenticated;
GRANT ALL ON public.order_tracking_events TO service_role;

ALTER TABLE public.order_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or staff can view tracking events" ON public.order_tracking_events
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'funcionario')
    OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
  );

CREATE POLICY "Staff can insert tracking events" ON public.order_tracking_events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "Staff can update tracking events" ON public.order_tracking_events
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

CREATE POLICY "Admins can delete tracking events" ON public.order_tracking_events
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- BALANCE HELPER
-- =========================
CREATE OR REPLACE FUNCTION public.customer_balance(_customer_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0) FROM public.customer_ledger WHERE customer_id = _customer_id;
$$;

REVOKE EXECUTE ON FUNCTION public.gen_tracking_code() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.customer_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_balance(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.gen_tracking_code() TO service_role;