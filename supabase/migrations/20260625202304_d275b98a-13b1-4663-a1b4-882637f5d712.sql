REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
-- Keep EXECUTE for authenticated on has_role so RLS policies that call it continue to work.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;