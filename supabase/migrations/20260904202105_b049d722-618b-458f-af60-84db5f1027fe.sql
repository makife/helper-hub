CREATE OR REPLACE FUNCTION public.set_task_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    IF NEW.urgency = 'urgent' THEN
      NEW.expires_at := now() + interval '2 hours';
    ELSIF NEW.scheduled_at IS NOT NULL THEN
      NEW.expires_at := NEW.scheduled_at
        + make_interval(mins => COALESCE(NEW.estimated_minutes, 30))
        + interval '3 hours';
    ELSE
      NEW.expires_at := now() + make_interval(mins => COALESCE(NEW.estimated_minutes, 30)) + interval '6 hours';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;