CREATE OR REPLACE FUNCTION public.request_task_completion(_task_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  t record;
  a record;
  min_seconds integer;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task_id;
  IF t IS NULL THEN RETURN 'not_found'; END IF;

  SELECT * INTO a FROM public.task_assignments
  WHERE task_id = _task_id AND tasker_id = auth.uid() AND status = 'accepted';
  IF a IS NULL THEN RETURN 'not_assigned'; END IF;

  IF t.status::text NOT IN ('open','matched','in_progress') THEN RETURN 'bad_status'; END IF;

  IF a.arrived_at IS NULL THEN RETURN 'no_arrival'; END IF;

  min_seconds := ceil(GREATEST(COALESCE(t.estimated_minutes,30) * 0.3, 5) * 60)::integer;
  IF now() < a.arrived_at + make_interval(secs => min_seconds) THEN
    RETURN 'too_soon';
  END IF;

  UPDATE public.tasks
  SET status = 'pending_confirm',
      completion_requested_at = now(),
      completion_requested_by = auth.uid()
  WHERE id = _task_id;

  RETURN 'ok';
END;
$function$;