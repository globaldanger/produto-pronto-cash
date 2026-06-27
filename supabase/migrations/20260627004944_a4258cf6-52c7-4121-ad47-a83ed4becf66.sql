
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'delivery',
  ADD COLUMN IF NOT EXISTS shipping_cep TEXT,
  ADD COLUMN IF NOT EXISTS shipping_street TEXT,
  ADD COLUMN IF NOT EXISTS shipping_number TEXT,
  ADD COLUMN IF NOT EXISTS shipping_complement TEXT,
  ADD COLUMN IF NOT EXISTS shipping_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS shipping_city TEXT,
  ADD COLUMN IF NOT EXISTS shipping_state TEXT,
  ADD COLUMN IF NOT EXISTS mp_init_point TEXT,
  ADD COLUMN IF NOT EXISTS mp_preference_id TEXT;

DROP POLICY IF EXISTS "Admin can delete orders" ON public.orders;
CREATE POLICY "Admin can delete orders" ON public.orders
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin can delete order_items" ON public.order_items;
CREATE POLICY "Admin can delete order_items" ON public.order_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
