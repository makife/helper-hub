ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'pending_confirm';
ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'expired';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completion_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS completion_requested_by uuid,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_task_expiry()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at := now() + make_interval(mins => COALESCE(NEW.estimated_minutes, 30)) + interval '6 hours';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_set_expiry ON public.tasks;
CREATE TRIGGER tasks_set_expiry
BEFORE INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.set_task_expiry();

UPDATE public.tasks
SET expires_at = created_at + make_interval(mins => COALESCE(estimated_minutes, 30)) + interval '6 hours'
WHERE expires_at IS NULL;

-- Notify both sides when a task is completed (review reminder)
CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status::text = 'completed' AND OLD.status::text IS DISTINCT FROM 'completed' THEN
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (NEW.owner_id, 'task_completed', 'Is tamamlandi', COALESCE(NEW.title,'Yardim cagrisi') || ' - degerlendirme yap', NEW.id);

    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    SELECT a.tasker_id, 'task_completed', 'Is tamamlandi', COALESCE(NEW.title,'Yardim cagrisi') || ' - degerlendirme yap', NEW.id
    FROM public.task_assignments a
    WHERE a.task_id = NEW.id AND a.status = 'accepted';

  ELSIF NEW.status::text = 'pending_confirm' AND OLD.status::text IS DISTINCT FROM 'pending_confirm' THEN
    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (NEW.owner_id, 'completion_requested', 'Is bitti olarak isaretlendi',
            COALESCE(NEW.title,'Yardim cagrisi') || ' - 24 saat icinde onaylamazsan otomatik tamamlanacak',
            NEW.id, NEW.completion_requested_by);

  ELSIF NEW.status::text = 'expired' AND OLD.status::text IS DISTINCT FROM 'expired' THEN
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (NEW.owner_id, 'task_expired', 'Yardim cagrinin suresi doldu',
            COALESCE(NEW.title,'Yardim cagrisi') || ' - kimse el atmadi, kredin iade edildi', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_notify_status ON public.tasks;
CREATE TRIGGER tasks_notify_status
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.notify_task_completed();

-- Scheduled maintenance: auto-confirm and auto-expire
CREATE OR REPLACE FUNCTION public.process_task_lifecycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  -- 1) auto confirm completions after 24h
  UPDATE public.tasks
  SET status = 'completed'::task_status, completed_at = now()
  WHERE status::text = 'pending_confirm'
    AND completion_requested_at IS NOT NULL
    AND completion_requested_at < now() - interval '24 hours';

  -- 2) expire untouched open tasks and refund the creation credit
  FOR r IN
    SELECT t.id, t.owner_id
    FROM public.tasks t
    WHERE t.status::text = 'open'
      AND t.expires_at IS NOT NULL
      AND t.expires_at < now()
      AND NOT EXISTS (
        SELECT 1 FROM public.task_assignments a
        WHERE a.task_id = t.id AND a.status = 'accepted'
      )
  LOOP
    UPDATE public.tasks
    SET status = 'expired'::task_status, cancelled_at = now()
    WHERE id = r.id;

    UPDATE public.profiles SET credits = COALESCE(credits, 0) + 1 WHERE user_id = r.owner_id;

    INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
    VALUES (r.owner_id, 1, 'refund', 'Suresi dolan yardim cagrisi iadesi', r.id);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_task_lifecycle() FROM public, anon, authenticated;

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule('process-task-lifecycle')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-task-lifecycle');

SELECT cron.schedule(
  'process-task-lifecycle',
  '*/10 * * * *',
  $$ SELECT public.process_task_lifecycle(); $$
);