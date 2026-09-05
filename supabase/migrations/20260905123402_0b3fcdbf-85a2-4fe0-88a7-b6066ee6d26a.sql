CREATE INDEX IF NOT EXISTS idx_tasks_active_scheduled
  ON public.tasks (scheduled_at)
  WHERE scheduled_at IS NOT NULL AND status IN ('matched','in_progress');

CREATE INDEX IF NOT EXISTS idx_task_assignments_accepted_no_arrival
  ON public.task_assignments (task_id)
  WHERE status = 'accepted' AND arrived_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_suspended_until
  ON public.profiles (suspended_until)
  WHERE suspended_until IS NOT NULL;

CREATE OR REPLACE FUNCTION public.process_no_show_tasks()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_any boolean;
BEGIN
  -- Fast exit: nothing scheduled in the relevant window and nobody to unsuspend
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.scheduled_at IS NOT NULL
      AND t.status IN ('matched','in_progress')
      AND t.scheduled_at <= now() + interval '1 hour'
  ) INTO v_any;

  IF v_any THEN
    FOR r IN
      SELECT t.id, a.tasker_id
      FROM public.tasks t
      JOIN public.task_assignments a
        ON a.task_id = t.id AND a.status = 'accepted' AND a.arrived_at IS NULL
      WHERE t.status IN ('matched', 'in_progress')
        AND t.scheduled_at IS NOT NULL
        AND t.noshow_reminder_sent_at IS NULL
        AND t.scheduled_at > now()
        AND t.scheduled_at <= now() + interval '1 hour'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, task_id)
      VALUES (r.tasker_id, 'schedule_reminder', 'Randevu saatin yaklasiyor',
              'Zamaninda gitmezsen cagri iptal edilir ve hesabin 1 ay askiya alinir.', r.id);
      UPDATE public.tasks SET noshow_reminder_sent_at = now() WHERE id = r.id;
    END LOOP;

    FOR r IN
      SELECT t.id, a.tasker_id
      FROM public.tasks t
      JOIN public.task_assignments a
        ON a.task_id = t.id AND a.status = 'accepted' AND a.arrived_at IS NULL
      WHERE t.status IN ('matched', 'in_progress')
        AND t.scheduled_at IS NOT NULL
        AND t.noshow_warning_sent_at IS NULL
        AND t.scheduled_at <= now()
        AND t.scheduled_at > now() - interval '1 hour'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, task_id)
      VALUES (r.tasker_id, 'schedule_warning', 'Randevu saatin gecti',
              '1 saat icinde varis kaydetmezsen cagri iptal edilir ve hesabin 1 ay askiya alinir.', r.id);
      UPDATE public.tasks SET noshow_warning_sent_at = now() WHERE id = r.id;
    END LOOP;

    FOR r IN
      SELECT t.id, t.owner_id, a.id AS assignment_id, a.tasker_id
      FROM public.tasks t
      JOIN public.task_assignments a
        ON a.task_id = t.id AND a.status = 'accepted' AND a.arrived_at IS NULL
      WHERE t.status IN ('matched', 'in_progress')
        AND t.scheduled_at IS NOT NULL
        AND t.scheduled_at < now() - interval '1 hour'
    LOOP
      UPDATE public.tasks
      SET status = 'cancelled'::task_status, cancelled_at = now()
      WHERE id = r.id;

      UPDATE public.task_assignments
      SET status = 'cancelled', updated_at = now()
      WHERE id = r.assignment_id;

      IF NOT EXISTS (
        SELECT 1 FROM public.credit_transactions c
        WHERE c.task_id = r.id AND c.kind = 'refund' AND c.user_id = r.owner_id
      ) THEN
        UPDATE public.profiles SET credits = COALESCE(credits, 0) + 1 WHERE user_id = r.owner_id;
        INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
        VALUES (r.owner_id, 1, 'refund', 'El atan randevuya gelmedigi icin kredi iadesi', r.id);
      END IF;

      UPDATE public.profiles
      SET is_banned = true,
          suspended_until = GREATEST(COALESCE(suspended_until, now()), now()) + interval '1 month',
          no_show_count = COALESCE(no_show_count, 0) + 1,
          is_available = false,
          updated_at = now()
      WHERE user_id = r.tasker_id;

      INSERT INTO public.notifications (user_id, type, title, body, task_id)
      VALUES (r.tasker_id, 'no_show_suspended', 'Hesabin 1 ay askiya alindi',
              'Randevu saatinden 1 saat sonra varis kaydetmedigin icin cagri iptal edildi.', r.id);

      INSERT INTO public.notifications (user_id, type, title, body, task_id)
      VALUES (r.owner_id, 'no_show_cancelled', 'Cagrin otomatik iptal edildi',
              'El atan randevuya gelmedi. 1 kredin iade edildi.', r.id);
    END LOOP;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE suspended_until IS NOT NULL AND suspended_until <= now()
  ) THEN
    UPDATE public.profiles
    SET is_banned = false, suspended_until = NULL, updated_at = now()
    WHERE suspended_until IS NOT NULL AND suspended_until <= now();
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.process_no_show_tasks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_no_show_tasks() TO service_role;