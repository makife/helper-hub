ALTER TYPE public.task_status ADD VALUE IF NOT EXISTS 'disputed';

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS rejection_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS last_rejected_at timestamptz;

ALTER TABLE public.task_assignments
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS arrival_distance_m integer;

-- Varış kaydı: el atan kişi iş konumuna yaklaştığında çağrılır
CREATE OR REPLACE FUNCTION public.mark_arrival(_task_id uuid, _distance_m integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a_id uuid;
BEGIN
  SELECT id INTO a_id FROM public.task_assignments
  WHERE task_id = _task_id AND tasker_id = auth.uid() AND status = 'accepted';

  IF a_id IS NULL THEN
    RAISE EXCEPTION 'Bu isin uzerinde degilsin';
  END IF;

  IF _distance_m IS NULL OR _distance_m > 300 THEN
    RETURN false;
  END IF;

  UPDATE public.task_assignments
  SET arrived_at = COALESCE(arrived_at, now()),
      arrival_distance_m = LEAST(COALESCE(arrival_distance_m, 999999), _distance_m)
  WHERE id = a_id;

  UPDATE public.tasks SET status = 'in_progress'
  WHERE id = _task_id AND status IN ('open','matched');

  RETURN true;
END;
$$;

-- Anlasmazligi tarafsiz kurallarla cozer
CREATE OR REPLACE FUNCTION public.resolve_dispute(_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  a record;
  guilty uuid;
  new_count integer;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task_id;
  IF t IS NULL THEN RETURN; END IF;

  SELECT * INTO a FROM public.task_assignments
  WHERE task_id = _task_id AND status = 'accepted'
  ORDER BY created_at ASC LIMIT 1;

  IF a.arrived_at IS NOT NULL THEN
    -- Varis kaniti var: el atan korunur, kredisi iade edilir
    guilty := t.owner_id;
    UPDATE public.profiles SET credits = COALESCE(credits,0) + 1 WHERE user_id = a.tasker_id;
    INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
    VALUES (a.tasker_id, 1, 'refund', 'Anlasmazlik cozumu - varis kaniti dogrulandi', _task_id);

    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (a.tasker_id, 'dispute_resolved', 'Anlasmazlik lehine sonuclandi',
            COALESCE(t.title,'Yardim cagrisi') || ' - varis kanitin dogrulandi, kredin iade edildi', _task_id);
  ELSE
    -- Varis kaniti yok: el atan sorumlu
    guilty := a.tasker_id;
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (t.owner_id, 'dispute_resolved', 'Anlasmazlik lehine sonuclandi',
            COALESCE(t.title,'Yardim cagrisi') || ' - varis kaniti bulunamadi', _task_id);
    UPDATE public.profiles SET credits = COALESCE(credits,0) + 1 WHERE user_id = t.owner_id;
    INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
    VALUES (t.owner_id, 1, 'refund', 'Anlasmazlik cozumu - is yapilmadi', _task_id);
  END IF;

  IF guilty IS NOT NULL THEN
    UPDATE public.profiles
    SET cancel_count = COALESCE(cancel_count,0) + 1
    WHERE user_id = guilty
    RETURNING cancel_count INTO new_count;

    IF COALESCE(new_count,0) >= 3 THEN
      UPDATE public.profiles SET is_banned = true WHERE user_id = guilty;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (guilty, 'dispute_resolved', 'Anlasmazlik aleyhine sonuclandi',
            COALESCE(t.title,'Yardim cagrisi') || ' - sicilinize kayit islendi (' || COALESCE(new_count,0) || '/3)', _task_id);
  END IF;

  UPDATE public.tasks
  SET status = 'cancelled', cancelled_at = now(), disputed_at = COALESCE(disputed_at, now())
  WHERE id = _task_id;
END;
$$;

-- El atan: "Isi bitirdim" - varis kaniti ve minimum sure kontrollu
CREATE OR REPLACE FUNCTION public.request_task_completion(_task_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  a record;
  min_minutes numeric;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task_id;
  IF t IS NULL THEN RETURN 'not_found'; END IF;

  SELECT * INTO a FROM public.task_assignments
  WHERE task_id = _task_id AND tasker_id = auth.uid() AND status = 'accepted';
  IF a IS NULL THEN RETURN 'not_assigned'; END IF;

  IF t.status::text NOT IN ('open','matched','in_progress') THEN RETURN 'bad_status'; END IF;

  IF a.arrived_at IS NULL THEN RETURN 'no_arrival'; END IF;

  min_minutes := GREATEST(COALESCE(t.estimated_minutes,30) * 0.3, 5);
  IF now() < a.arrived_at + make_interval(mins => min_minutes) THEN
    RETURN 'too_soon';
  END IF;

  UPDATE public.tasks
  SET status = 'pending_confirm',
      completion_requested_at = now(),
      completion_requested_by = auth.uid()
  WHERE id = _task_id;

  RETURN 'ok';
END;
$$;

-- Cagri sahibi: "Is yapilmadi" itirazi
CREATE OR REPLACE FUNCTION public.reject_task_completion(_task_id uuid, _reason text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  a record;
  new_rejections integer;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task_id;
  IF t IS NULL OR t.owner_id <> auth.uid() THEN RETURN 'not_owner'; END IF;
  IF t.status::text <> 'pending_confirm' THEN RETURN 'bad_status'; END IF;

  SELECT * INTO a FROM public.task_assignments
  WHERE task_id = _task_id AND status = 'accepted' ORDER BY created_at ASC LIMIT 1;

  new_rejections := COALESCE(t.rejection_count,0) + 1;

  IF new_rejections >= 2 THEN
    UPDATE public.tasks
    SET rejection_count = new_rejections,
        status = 'disputed',
        disputed_at = now(),
        dispute_reason = COALESCE(_reason, t.dispute_reason),
        last_rejected_at = now()
    WHERE id = _task_id;

    PERFORM public.resolve_dispute(_task_id);
    RETURN 'disputed';
  END IF;

  UPDATE public.tasks
  SET rejection_count = new_rejections,
      status = 'in_progress',
      completion_requested_at = NULL,
      completion_requested_by = NULL,
      dispute_reason = COALESCE(_reason, t.dispute_reason),
      last_rejected_at = now()
  WHERE id = _task_id;

  IF a.tasker_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (a.tasker_id, 'completion_rejected', 'Is tamamlanmadi olarak isaretlendi',
            COALESCE(t.title,'Yardim cagrisi') || ' - is veren itiraz etti. Tamamlayip tekrar bildirebilirsin.',
            _task_id, t.owner_id);
  END IF;

  RETURN 'rejected';
END;
$$;

-- Yasam dongusu: 24 saat sonra otomatik onay yalnizca varis kaniti varsa
CREATE OR REPLACE FUNCTION public.process_task_lifecycle()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    UPDATE public.profiles SET credits = COALESCE(credits, 0) + 1 WHERE user_id = r.owner_id;

    INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
    VALUES (r.owner_id, 1, 'refund', 'Suresi dolan yardim cagrisi iadesi', r.id);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_dispute(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_arrival(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_task_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_task_completion(uuid, text) TO authenticated;