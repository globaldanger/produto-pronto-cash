ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS photos_in text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS photos_out text[] NOT NULL DEFAULT '{}';