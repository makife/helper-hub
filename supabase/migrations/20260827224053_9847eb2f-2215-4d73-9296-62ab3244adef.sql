CREATE TABLE public.task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tasker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreed_price integer,
  status text NOT NULL DEFAULT 'accepted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, tasker_id)
);

GRANT SELECT ON public.task_assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_assignments TO authenticated;
GRANT ALL ON public.task_assignments TO service_role;

ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Assignments viewable by everyone"
  ON public.task_assignments FOR SELECT USING (true);

CREATE POLICY "Taskers can accept tasks"
  ON public.task_assignments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = tasker_id);

CREATE POLICY "Taskers can update own assignment"
  ON public.task_assignments FOR UPDATE TO authenticated
  USING (auth.uid() = tasker_id);

CREATE POLICY "Taskers can leave own assignment"
  ON public.task_assignments FOR DELETE TO authenticated
  USING (auth.uid() = tasker_id);

CREATE TRIGGER update_task_assignments_updated_at
  BEFORE UPDATE ON public.task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enforce: one active job per tasker
CREATE OR REPLACE FUNCTION public.enforce_single_active_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_count integer;
BEGIN
  SELECT count(*) INTO active_count
  FROM public.task_assignments a
  JOIN public.tasks t ON t.id = a.task_id
  WHERE a.tasker_id = NEW.tasker_id
    AND a.status = 'accepted'
    AND t.status IN ('open','matched','in_progress');

  IF active_count >= 1 THEN
    RAISE EXCEPTION 'Zaten aktif bir isin var';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER task_assignments_single_active
  BEFORE INSERT ON public.task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_active_assignment();

-- Auto close / reopen task based on accepted count
CREATE OR REPLACE FUNCTION public.sync_task_fill_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t_id uuid;
  accepted_count integer;
  needed integer;
  first_tasker uuid;
BEGIN
  t_id := COALESCE(NEW.task_id, OLD.task_id);

  SELECT count(*) INTO accepted_count
  FROM public.task_assignments
  WHERE task_id = t_id AND status = 'accepted';

  SELECT person_count INTO needed FROM public.tasks WHERE id = t_id;

  SELECT tasker_id INTO first_tasker
  FROM public.task_assignments
  WHERE task_id = t_id AND status = 'accepted'
  ORDER BY created_at ASC LIMIT 1;

  IF accepted_count >= COALESCE(needed, 1) THEN
    UPDATE public.tasks
    SET status = 'matched', tasker_id = first_tasker, matched_at = COALESCE(matched_at, now())
    WHERE id = t_id AND status = 'open';
  ELSE
    UPDATE public.tasks
    SET status = 'open', tasker_id = first_tasker, matched_at = NULL
    WHERE id = t_id AND status = 'matched';
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER task_assignments_sync_fill
  AFTER INSERT OR UPDATE OR DELETE ON public.task_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sync_task_fill_status();

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignments;