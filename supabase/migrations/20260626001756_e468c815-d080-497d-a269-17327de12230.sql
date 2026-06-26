
-- ===== Bloco 1: Novos campos de conteúdo em store_settings =====
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS home_hero_title text DEFAULT '',
  ADD COLUMN IF NOT EXISTS home_hero_subtitle text DEFAULT '',
  ADD COLUMN IF NOT EXISTS home_hero_cta text DEFAULT '',
  ADD COLUMN IF NOT EXISTS home_banners jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS product_page_shipping_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS product_page_warranty_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS product_page_extra_info text DEFAULT '',
  ADD COLUMN IF NOT EXISTS faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS footer_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_payment_methods text DEFAULT '',
  ADD COLUMN IF NOT EXISTS receipt_header_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS receipt_footer_text text DEFAULT 'Obrigado pela preferência!',
  ADD COLUMN IF NOT EXISTS receipt_show_logo boolean NOT NULL DEFAULT true;

-- ===== Bloco 3: RLS para funcionário =====
-- Produtos: funcionário pode gerenciar
DROP POLICY IF EXISTS "staff manage products" ON public.products;
CREATE POLICY "staff manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

DROP POLICY IF EXISTS "staff view all products" ON public.products;
CREATE POLICY "staff view all products" ON public.products
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

-- Categorias: funcionário pode gerenciar
DROP POLICY IF EXISTS "staff manage categories" ON public.categories;
CREATE POLICY "staff manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

-- Pedidos: funcionário pode ver todos e atualizar status (não cancela/reembolsa via RLS — controlado na UI)
DROP POLICY IF EXISTS "staff view all orders" ON public.orders;
CREATE POLICY "staff view all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

DROP POLICY IF EXISTS "staff update orders" ON public.orders;
CREATE POLICY "staff update orders" ON public.orders
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

DROP POLICY IF EXISTS "staff insert orders" ON public.orders;
CREATE POLICY "staff insert orders" ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

-- Order items: funcionário pode gerenciar
DROP POLICY IF EXISTS "staff manage order items" ON public.order_items;
CREATE POLICY "staff manage order items" ON public.order_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

-- Profiles: admin vê todos (já existia); funcionário também vê todos para gestão de pedidos
DROP POLICY IF EXISTS "staff view all profiles" ON public.profiles;
CREATE POLICY "staff view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'funcionario'));

-- user_roles: somente admin pode gerenciar (já existia) — sem mudança
