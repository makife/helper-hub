ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;

CREATE OR REPLACE FUNCTION public.validate_scheduled_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.scheduled_at IS NOT NULL THEN
    IF NEW.urgency = 'urgent' THEN
      NEW.scheduled_at := NULL;
    ELSIF NEW.scheduled_at > now() + interval '7 days' THEN
      RAISE EXCEPTION 'Randevu en fazla 7 gün sonrasına verilebilir';
    ELSIF TG_OP = 'INSERT' AND NEW.scheduled_at < now() - interval '10 minutes' THEN
      RAISE EXCEPTION 'Randevu geçmiş bir zamana verilemez';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tasks_validate_scheduled_at ON public.tasks;
CREATE TRIGGER tasks_validate_scheduled_at
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.validate_scheduled_at();

CREATE OR REPLACE FUNCTION public.set_task_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.expires_at IS NULL THEN
    IF NEW.scheduled_at IS NOT NULL THEN
      NEW.expires_at := NEW.scheduled_at
        + make_interval(mins => COALESCE(NEW.estimated_minutes, 30))
        + interval '3 hours';
    ELSE
      NEW.expires_at := now() + make_interval(mins => COALESCE(NEW.estimated_minutes, 30)) + interval '6 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;