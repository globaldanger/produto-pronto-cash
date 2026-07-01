
-- Switch has_role to SECURITY INVOKER so it's not flagged as a definer function
-- callable via PostgREST RPC. Recursion is avoided because user_roles has a
-- "users view own roles" policy allowing auth.uid()=user_id reads.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Column-level protection: hide cost_price and mercadopago_access_token from anon
REVOKE SELECT (cost_price) ON public.products FROM anon;
REVOKE SELECT (mercadopago_access_token) ON public.store_settings FROM anon;
