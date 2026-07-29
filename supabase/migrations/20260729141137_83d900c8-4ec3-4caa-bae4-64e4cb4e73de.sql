-- PRODUCTS: anon must not read cost_price
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (id, name, description, price, sale_price, stock, category_id, images, featured, active, created_at, updated_at, tags) ON public.products TO anon;

-- STORE_SETTINGS: nobody but service_role reads mercadopago_access_token
REVOKE SELECT ON public.store_settings FROM anon, authenticated;
DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'store_settings'
    AND column_name <> 'mercadopago_access_token';
  EXECUTE format('GRANT SELECT (%s) ON public.store_settings TO anon, authenticated', cols);
END $$;

GRANT ALL ON public.products TO service_role;
GRANT ALL ON public.store_settings TO service_role;