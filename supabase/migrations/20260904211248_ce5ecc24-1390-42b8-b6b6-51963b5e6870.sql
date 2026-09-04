CREATE OR REPLACE FUNCTION public.require_reviews_done()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
  payload jsonb;
BEGIN
  payload := to_jsonb(NEW);
  IF TG_TABLE_NAME = 'tasks' THEN
    uid := (payload ->> 'owner_id')::uuid;
  ELSE
    uid := (payload ->> 'tasker_id')::uuid;
  END IF;
  IF uid IS NOT NULL AND public.has_pending_reviews(uid) THEN
    RAISE EXCEPTION 'Bekleyen degerlendirme var';
  END IF;
  RETURN NEW;
END;
$function$;