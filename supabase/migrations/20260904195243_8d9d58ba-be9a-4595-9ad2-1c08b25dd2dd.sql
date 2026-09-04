CREATE OR REPLACE FUNCTION public._settle_unfilled_task(p_task_id uuid, p_action text, p_auto boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner_id uuid;
  v_title text;
  v_first_tasker uuid;
  r record;
BEGIN
  SELECT owner_id, title INTO v_owner_id, v_title
  FROM public.tasks WHERE id = p_task_id FOR UPDATE;

  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'Görev bulunamadı'; END IF;

  IF p_action = 'cancel' THEN
    FOR r IN
      SELECT tasker_id FROM public.task_assignments
      WHERE task_id = p_task_id AND status = 'accepted'
    LOOP
      INSERT INTO public.notifications (user_id, type, title, body, task_id)
      VALUES (r.tasker_id, 'task_auto_cancelled',
        'Yardım çağrısı iptal edildi',
        CASE WHEN p_auto
          THEN COALESCE(v_title, 'Yardım çağrısı') || ' — çağrı yapan işi başlatmadığı için iş iptal oldu.'
          ELSE COALESCE(v_title, 'Yardım çağrısı') || ' — çağrı yapan işi iptal etti.'
        END,
        p_task_id);
    END LOOP;

    DELETE FROM public.task_assignments WHERE task_id = p_task_id;

    UPDATE public.tasks
    SET status = 'cancelled', cancelled_at = now(), wait_decided = true
    WHERE id = p_task_id;

    IF p_auto THEN
      INSERT INTO public.notifications (user_id, type, title, body, task_id)
      VALUES (v_owner_id, 'task_auto_cancelled',
        'Çağrınız otomatik iptal edildi',
        'Süre dolduğunda bir işlem yapmadığın için ' || COALESCE(v_title, 'çağrın') || ' otomatik olarak iptal edildi.',
        p_task_id);
    END IF;

  ELSIF p_action = 'start' THEN
    SELECT tasker_id INTO v_first_tasker
    FROM public.task_assignments
    WHERE task_id = p_task_id AND status = 'accepted'
    ORDER BY created_at ASC LIMIT 1;

    IF v_first_tasker IS NULL THEN RAISE EXCEPTION 'Kabul eden kimse yok, başlatılamaz'; END IF;

    UPDATE public.tasks
    SET status = 'matched', tasker_id = v_first_tasker, matched_at = now(), wait_decided = true
    WHERE id = p_task_id;
  ELSE
    RAISE EXCEPTION 'Geçersiz aksiyon: %', p_action;
  END IF;
END;
$function$;

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

    IF NOT EXISTS (
      SELECT 1 FROM public.credit_transactions c
      WHERE c.task_id = r.id AND c.kind = 'refund' AND c.user_id = r.owner_id
    ) THEN
      UPDATE public.profiles SET credits = COALESCE(credits, 0) + 1 WHERE user_id = r.owner_id;
      INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
      VALUES (r.owner_id, 1, 'refund', 'Süresi dolan çağrı için kredi iadesi', r.id);
    END IF;
  END LOOP;
END;
$function$;