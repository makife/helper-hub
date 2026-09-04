CREATE OR REPLACE FUNCTION public.guard_current_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.current_price := NEW.price;
  ELSE
    NEW.current_price := COALESCE(public.compute_task_current_price(NEW.id), NEW.price);
  END IF;
  RETURN NEW;
END;
$function$;