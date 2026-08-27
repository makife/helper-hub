CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.notify_assignment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t_owner uuid;
  t_title text;
  actor_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT owner_id, title INTO t_owner, t_title FROM public.tasks WHERE id = NEW.task_id;
    SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.tasker_id;
    IF t_owner IS NOT NULL AND t_owner <> NEW.tasker_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
      VALUES (t_owner, 'assignment_accepted',
              COALESCE(actor_name, 'Bir kullanici') || ' cagrini kabul etti',
              COALESCE(t_title, 'Yardim cagrisi'), NEW.task_id, NEW.tasker_id);
    END IF;
    RETURN NEW;
  ELSE
    SELECT owner_id, title INTO t_owner, t_title FROM public.tasks WHERE id = OLD.task_id;
    SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = OLD.tasker_id;
    IF t_owner IS NOT NULL AND t_owner <> OLD.tasker_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
      VALUES (t_owner, 'assignment_left',
              COALESCE(actor_name, 'Bir kullanici') || ' isi birakti',
              COALESCE(t_title, 'Yardim cagrisi'), OLD.task_id, OLD.tasker_id);
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER task_assignments_notify_insert
AFTER INSERT ON public.task_assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_event();

CREATE TRIGGER task_assignments_notify_delete
AFTER DELETE ON public.task_assignments
FOR EACH ROW EXECUTE FUNCTION public.notify_assignment_event();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;