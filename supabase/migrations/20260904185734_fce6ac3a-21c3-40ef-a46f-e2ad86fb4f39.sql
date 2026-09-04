CREATE OR REPLACE FUNCTION public.compute_task_current_price(_task_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t record;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task_id;
  IF t IS NULL THEN
    RETURN NULL;
  END IF;
  -- Dinamik fiyat düşüşü kaldırıldı: ilan fiyatı sabittir.
  RETURN t.price;
END;
$function$;

UPDATE public.tasks
SET current_price = price, price_drop_started_at = NULL
WHERE status = 'open';