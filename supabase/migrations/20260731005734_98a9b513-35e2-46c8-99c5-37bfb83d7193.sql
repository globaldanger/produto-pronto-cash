CREATE TABLE IF NOT EXISTS public.store_secrets (
  id text PRIMARY KEY DEFAULT 'default',
  mercadopago_access_token text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.store_secrets FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.store_secrets TO service_role;

ALTER TABLE public.store_secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access to store secrets" ON public.store_secrets;
CREATE POLICY "No client access to store secrets"
ON public.store_secrets FOR ALL TO anon, authenticated
USING (false) WITH CHECK (false);

INSERT INTO public.store_secrets (id, mercadopago_access_token)
SELECT 'default', s.mercadopago_access_token
FROM public.store_settings s
WHERE s.mercadopago_access_token IS NOT NULL
LIMIT 1
ON CONFLICT (id) DO UPDATE SET mercadopago_access_token = EXCLUDED.mercadopago_access_token;

INSERT INTO public.store_secrets (id) VALUES ('default') ON CONFLICT (id) DO NOTHING;

DROP TRIGGER IF EXISTS set_store_secrets_updated_at ON public.store_secrets;
CREATE TRIGGER set_store_secrets_updated_at
BEFORE UPDATE ON public.store_secrets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.store_settings DROP COLUMN IF EXISTS mercadopago_access_token;