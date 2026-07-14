
-- products: revoke blanket SELECT from anon, re-grant only non-sensitive columns
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (id, name, description, price, sale_price, stock, category_id, images, featured, active, created_at, updated_at, tags) ON public.products TO anon;

-- store_settings: revoke blanket SELECT from anon+authenticated, re-grant all columns except mercadopago_access_token
REVOKE SELECT ON public.store_settings FROM anon;
REVOKE SELECT ON public.store_settings FROM authenticated;
GRANT SELECT (
  id, store_name, store_slogan, store_logo, store_email, store_phone, store_whatsapp,
  store_address, store_hours, support_image, about_text1, about_text2,
  about_stat1_number, about_stat1_label, about_stat2_number, about_stat2_label,
  about_stat3_number, about_stat3_label, about_stat4_number, about_stat4_label,
  updated_at, store_instagram, pix_key, store_header_image, about_hero_image, about_gallery,
  home_hero_title, home_hero_subtitle, home_hero_cta, home_banners,
  product_page_shipping_text, product_page_warranty_text, product_page_extra_info,
  faq, footer_text, footer_links, footer_payment_methods,
  receipt_header_text, receipt_footer_text, receipt_show_logo,
  active_theme_key, theme_expires_at, loyalty_points_per_real, loyalty_real_per_point
) ON public.store_settings TO anon, authenticated;
