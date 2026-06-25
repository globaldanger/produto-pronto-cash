ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS store_header_image text,
  ADD COLUMN IF NOT EXISTS about_hero_image text,
  ADD COLUMN IF NOT EXISTS about_gallery text[] NOT NULL DEFAULT '{}'::text[];