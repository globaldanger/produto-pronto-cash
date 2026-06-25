-- New columns for orders (physical store, payment method, refunds)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'online' CHECK (channel IN ('online','fisica')),
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_reason text;

-- Add 'refunded' to order_status enum (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'refunded' AND enumtypid = 'public.order_status'::regtype) THEN
    ALTER TYPE public.order_status ADD VALUE 'refunded';
  END IF;
END $$;

-- store_settings: header + about images/gallery
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS store_header_image text,
  ADD COLUMN IF NOT EXISTS about_hero_image text,
  ADD COLUMN IF NOT EXISTS about_gallery text[] NOT NULL DEFAULT '{}';

-- Allow customer_name/phone to be optional for physical sales without customer
ALTER TABLE public.orders ALTER COLUMN customer_name DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN customer_phone DROP NOT NULL;

-- Allow admin to insert orders for physical sales without strict user_id linkage
-- (keep user_id NOT NULL but allow admin to set it to their own id for physical sales)

-- Policy: allow admin to update/delete/insert any order (for cancellations, edits, refunds, PDV)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='Admins manage all orders') THEN
    CREATE POLICY "Admins manage all orders" ON public.orders
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_items' AND policyname='Admins manage all order_items') THEN
    CREATE POLICY "Admins manage all order_items" ON public.order_items
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Stock helper functions (security definer to bypass RLS for atomic updates)
CREATE OR REPLACE FUNCTION public.decrement_stock(_product_id uuid, _qty integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.products SET stock = GREATEST(stock - _qty, 0) WHERE id = _product_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_stock(_product_id uuid, _qty integer)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.products SET stock = stock + _qty WHERE id = _product_id;
$$;

REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_stock(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_stock(uuid, integer) TO authenticated, service_role;