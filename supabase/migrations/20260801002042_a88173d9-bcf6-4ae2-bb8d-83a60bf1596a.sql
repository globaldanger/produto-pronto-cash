CREATE TABLE public.service_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text,
  customer_cpf text,
  customer_address text,
  device text not null,
  brand text,
  model text,
  imei text,
  color text,
  accessories text,
  defect_reported text,
  diagnosis text,
  service_done text,
  parts_used text,
  price numeric not null default 0,
  amount_paid numeric not null default 0,
  status text not null default 'aberta',
  warranty_days integer not null default 90,
  warranty_start date not null default (now()::date),
  warranty_text text,
  technician text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_orders TO authenticated;
GRANT ALL ON public.service_orders TO service_role;

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view service orders" ON public.service_orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));
CREATE POLICY "Staff can create service orders" ON public.service_orders FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));
CREATE POLICY "Staff can update service orders" ON public.service_orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));
CREATE POLICY "Admins can delete service orders" ON public.service_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER service_orders_updated_at BEFORE UPDATE ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.gen_service_code()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
BEGIN
  LOOP
    code := 'OS';
    FOR i IN 1..8 LOOP
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.service_orders WHERE service_orders.code = code);
  END LOOP;
  RETURN code;
END;
$$;

ALTER TABLE public.service_orders ALTER COLUMN code SET DEFAULT public.gen_service_code();