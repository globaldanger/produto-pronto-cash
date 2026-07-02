-- Grants
GRANT SELECT ON public.coupons TO anon, authenticated;
GRANT ALL   ON public.coupons TO service_role;

GRANT SELECT, INSERT, DELETE ON public.coupon_redemptions TO authenticated;
GRANT ALL   ON public.coupon_redemptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT ALL   ON public.favorites TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_addresses TO authenticated;
GRANT ALL   ON public.customer_addresses TO service_role;

GRANT SELECT ON public.loyalty_points TO authenticated;
GRANT ALL   ON public.loyalty_points TO service_role;

GRANT SELECT ON public.theme_packs TO anon, authenticated;
GRANT ALL   ON public.theme_packs TO service_role;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_points;
ALTER PUBLICATION supabase_realtime ADD TABLE public.favorites;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_addresses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.theme_packs;