CREATE OR REPLACE FUNCTION public.notify_admins_on_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a RECORD;
  reporter_name TEXT;
BEGIN
  SELECT full_name INTO reporter_name FROM public.profiles WHERE user_id = NEW.reporter_id;
  FOR a IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (
      a.user_id,
      'report',
      'Yeni şikayet',
      COALESCE(reporter_name, 'Bir kullanıcı') || ' bir şikayet gönderdi: ' || NEW.reason,
      NEW.task_id,
      NEW.reporter_id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_report ON public.user_reports;
CREATE TRIGGER trg_notify_admins_on_report
AFTER INSERT ON public.user_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_report();