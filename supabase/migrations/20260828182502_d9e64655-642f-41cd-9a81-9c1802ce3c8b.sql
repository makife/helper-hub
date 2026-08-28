CREATE OR REPLACE FUNCTION public.process_task_lifecycle()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT t.id,
           EXISTS (SELECT 1 FROM public.task_assignments a
                   WHERE a.task_id = t.id AND a.status = 'accepted' AND a.arrived_at IS NOT NULL) AS has_proof
    FROM public.tasks t
    WHERE t.status::text = 'pending_confirm'
      AND t.completion_requested_at IS NOT NULL
      AND t.completion_requested_at < now() - interval '24 hours'
  LOOP
    IF r.has_proof THEN
      UPDATE public.tasks
      SET status = 'completed'::task_status, completed_at = now()
      WHERE id = r.id;
    ELSE
      UPDATE public.tasks
      SET status = 'disputed'::task_status, disputed_at = now()
      WHERE id = r.id;
      PERFORM public.resolve_dispute(r.id);
    END IF;
  END LOOP;

  FOR r IN
    SELECT t.id
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
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_task_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            COALESCE(NEW.title,'Yardim cagrisi') || ' - kimse el atmadi, cagri kapatildi', NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;