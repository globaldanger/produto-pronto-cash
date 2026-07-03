-- Hide product cost_price from anonymous visitors (column-level access via explicit grants)
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (id, name, description, price, sale_price, stock, category_id, images, active, featured, created_at, updated_at, tags) ON public.products TO anon;

-- Hide MercadoPago access token from any client-side read (anon + authenticated).
-- Only service_role (server functions using supabaseAdmin) can read the token now.
REVOKE SELECT ON public.store_settings FROM anon, authenticated;
GRANT SELECT (
  id, store_name, store_slogan, store_logo, store_email, store_phone,
  store_whatsapp, store_address, store_hours, support_image,
  about_text1, about_text2,
  about_stat1_number, about_stat1_label,
  about_stat2_number, about_stat2_label,
  about_stat3_number, about_stat3_label,
  about_stat4_number, about_stat4_label,
  about_hero_image, about_gallery,
  home_hero_title, home_hero_subtitle, home_hero_cta, home_banners,
  product_page_shipping_text, product_page_warranty_text, product_page_extra_info,
  faq, footer_text, footer_links, footer_payment_methods,
  receipt_header_text, receipt_footer_text, receipt_show_logo,
  active_theme_key, theme_expires_at,
  loyalty_points_per_real, loyalty_real_per_point,
  store_instagram, pix_key, store_header_image, updated_at
) ON public.store_settings TO anon, authenticated;

-- Coupons: stop letting anonymous visitors enumerate active discount codes.
DROP POLICY IF EXISTS "public read active coupons" ON public.coupons;
CREATE POLICY "authenticated read active coupons" ON public.coupons
  FOR SELECT TO authenticated USING (active = true);
REVOKE SELECT ON public.coupons FROM anon;