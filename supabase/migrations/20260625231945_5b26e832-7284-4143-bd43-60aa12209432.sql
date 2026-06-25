-- Add cost_price to products for margin calculation
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10,2) DEFAULT 0;

-- Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  category TEXT NOT NULL DEFAULT 'geral',
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage expenses" ON public.expenses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER expenses_set_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Store settings (single row keyed by slug='default')
CREATE TABLE IF NOT EXISTS public.store_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT NOT NULL DEFAULT 'SmartCell',
  store_slogan TEXT DEFAULT 'Acessórios premium para seu smartphone',
  store_logo TEXT DEFAULT '',
  store_email TEXT DEFAULT '',
  store_phone TEXT DEFAULT '',
  store_whatsapp TEXT DEFAULT '',
  store_address TEXT DEFAULT '',
  store_hours TEXT DEFAULT 'Seg-Sex 9h-18h',
  support_image TEXT DEFAULT '',
  about_text1 TEXT DEFAULT '',
  about_text2 TEXT DEFAULT '',
  about_stat1_number TEXT DEFAULT '500+',
  about_stat1_label TEXT DEFAULT 'Clientes',
  about_stat2_number TEXT DEFAULT '1000+',
  about_stat2_label TEXT DEFAULT 'Produtos vendidos',
  about_stat3_number TEXT DEFAULT '5',
  about_stat3_label TEXT DEFAULT 'Anos no mercado',
  about_stat4_number TEXT DEFAULT '4.9',
  about_stat4_label TEXT DEFAULT 'Avaliação média',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read store settings" ON public.store_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins update store settings" ON public.store_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert store settings" ON public.store_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER store_settings_set_updated_at BEFORE UPDATE ON public.store_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.store_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;