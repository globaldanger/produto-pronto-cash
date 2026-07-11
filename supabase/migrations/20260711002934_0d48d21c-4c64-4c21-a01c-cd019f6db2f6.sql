-- Revoke cost_price from anonymous users (staff/admin still have it via authenticated role)
REVOKE SELECT (cost_price) ON public.products FROM anon;

-- Revoke mercadopago_access_token from both anon and authenticated
-- Server admin functions use service_role which bypasses column privileges
REVOKE SELECT (mercadopago_access_token) ON public.store_settings FROM anon;
REVOKE SELECT (mercadopago_access_token) ON public.store_settings FROM authenticated;