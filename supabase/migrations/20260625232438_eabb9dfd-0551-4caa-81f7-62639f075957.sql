
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS store_instagram TEXT,
  ADD COLUMN IF NOT EXISTS pix_key TEXT,
  ADD COLUMN IF NOT EXISTS mercadopago_access_token TEXT;
