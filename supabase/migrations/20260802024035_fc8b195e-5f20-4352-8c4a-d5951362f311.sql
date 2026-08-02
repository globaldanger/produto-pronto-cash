CREATE OR REPLACE FUNCTION public.gen_service_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  i int;
BEGIN
  LOOP
    new_code := 'OS';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.service_orders so WHERE so.code = new_code);
  END LOOP;
  RETURN new_code;
END;
$function$;

CREATE OR REPLACE FUNCTION public.gen_tracking_code()
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  new_code text;
  i int;
BEGIN
  LOOP
    new_code := 'SC';
    FOR i IN 1..8 LOOP
      new_code := new_code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.tracking_code = new_code);
  END LOOP;
  RETURN new_code;
END;
$function$;