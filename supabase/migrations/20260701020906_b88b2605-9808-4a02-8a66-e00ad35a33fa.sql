
-- ============ COUPONS ============
CREATE TYPE public.coupon_type AS ENUM ('percent','fixed','free_shipping');

CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  type public.coupon_type NOT NULL DEFAULT 'percent',
  value numeric(10,2) NOT NULL DEFAULT 0,
  min_order numeric(10,2) NOT NULL DEFAULT 0,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active coupons" ON public.coupons FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "staff manage coupons" ON public.coupons FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid,
  discount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user view own redemptions" ON public.coupon_redemptions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE POLICY "staff manage redemptions" ON public.coupon_redemptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));

-- ============ LOYALTY ============
CREATE TABLE public.loyalty_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  points integer NOT NULL,
  reason text NOT NULL DEFAULT 'purchase',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_points TO authenticated;
GRANT ALL ON public.loyalty_points TO service_role;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user view own points" ON public.loyalty_points FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));

-- ============ REVIEWS ============
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  approved boolean NOT NULL DEFAULT true,
  customer_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, user_id, order_id)
);
GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public view approved reviews" ON public.product_reviews FOR SELECT TO anon, authenticated USING (approved = true);
CREATE POLICY "user view own reviews" ON public.product_reviews FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user insert own review" ON public.product_reviews FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user update own review" ON public.product_reviews FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "staff moderate reviews" ON public.product_reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON public.product_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SHIPPING RATES ============
CREATE TABLE public.shipping_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  cep_from text NOT NULL,
  cep_to text NOT NULL,
  price numeric(10,2) NOT NULL DEFAULT 0,
  days integer NOT NULL DEFAULT 3,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shipping_rates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_rates TO authenticated;
GRANT ALL ON public.shipping_rates TO service_role;
ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active rates" ON public.shipping_rates FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "staff manage rates" ON public.shipping_rates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'funcionario'));
CREATE TRIGGER shipping_updated_at BEFORE UPDATE ON public.shipping_rates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FAVORITES ============
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manage own favorites" ON public.favorites FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ CUSTOMER ADDRESSES ============
CREATE TABLE public.customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text,
  cep text NOT NULL,
  street text NOT NULL,
  number text NOT NULL,
  complement text,
  neighborhood text,
  city text NOT NULL,
  state text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL ON public.customer_addresses TO service_role;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manage own addresses" ON public.customer_addresses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ THEME PACKS ============
CREATE TABLE public.theme_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  accent_color text NOT NULL DEFAULT '#c9a84c',
  accent_glow text NOT NULL DEFAULT '#f0d78c',
  banner_text text,
  banner_subtext text,
  decoration text NOT NULL DEFAULT 'none',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.theme_packs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.theme_packs TO authenticated;
GRANT ALL ON public.theme_packs TO service_role;
ALTER TABLE public.theme_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read themes" ON public.theme_packs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage themes" ON public.theme_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.theme_packs (key, name, accent_color, accent_glow, banner_text, banner_subtext, decoration) VALUES
  ('default','Padrão','#c9a84c','#f0d78c',NULL,NULL,'none'),
  ('sao_joao','São João','#e85d3a','#f5b431','Arraiá SmartCell','Ofertas quentes como fogueira','flags'),
  ('copa','Copa do Mundo','#009c3b','#ffdf00','#VaiBrasil na SmartCell','Torça e economize com a gente','ball'),
  ('ano_novo','Ano Novo','#c9a84c','#f5f5dc','Feliz Ano Novo','Comece o ano com o celular novo','fireworks'),
  ('natal','Natal','#c62828','#2e7d32','Natal SmartCell','Presenteie quem você ama','snow'),
  ('black_friday','Black Friday','#00e5ff','#ff007a','BLACK FRIDAY','Descontos absurdos por tempo limitado','neon'),
  ('carnaval','Carnaval','#e91e63','#00bcd4','Carnaval SmartCell','Folia com preços que fazem sambar','confetti'),
  ('dia_das_maes','Dia das Mães','#ec407a','#f8bbd0','Dia das Mães','O presente perfeito pra ela','hearts')
ON CONFLICT (key) DO NOTHING;

-- ============ EXTEND EXISTING TABLES ============
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS kanban_status text NOT NULL DEFAULT 'new';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_coupon numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_used integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_fee numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS active_theme_key text NOT NULL DEFAULT 'default';
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS theme_expires_at timestamptz;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS loyalty_points_per_real numeric(10,4) NOT NULL DEFAULT 1;
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS loyalty_real_per_point numeric(10,4) NOT NULL DEFAULT 0.05;
