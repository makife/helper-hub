-- 1) Her türlü iptalde kredi düşsün: kontenjan dolmadan iptalde tasker iadesi kaldırıldı
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

    PERFORM public.charge_employer_credit(p_task_id, v_owner_id,
      CASE WHEN p_auto THEN 'Otomatik iptal edilen çağrı ücreti' ELSE 'Kontenjan dolmadan iptal edilen çağrı ücreti' END);

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

    PERFORM public.charge_employer_credit(p_task_id, v_owner_id, 'Eksik kontenjanla başlatılan çağrı ücreti');

    UPDATE public.tasks
    SET status = 'matched', tasker_id = v_first_tasker, matched_at = now(), wait_decided = true
    WHERE id = p_task_id;
  ELSE
    RAISE EXCEPTION 'Geçersiz aksiyon: %', p_action;
  END IF;
END;
$function$;

-- 8) Onay bekleyen iş de iptal edilebilsin
CREATE OR REPLACE FUNCTION public.cancel_task(_task_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.tasks
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = _task_id
    AND owner_id = auth.uid()
    AND status IN ('open', 'matched', 'in_progress', 'pending_confirm');
  RETURN FOUND;
END;
$function$;

-- 4) Güncel fiyat sadece sunucuda hesaplansın
CREATE OR REPLACE FUNCTION public.guard_current_price()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.current_price := NEW.price;
  ELSE
    NEW.price := OLD.price;
    NEW.min_price := OLD.min_price;
    NEW.price_drop_started_at := OLD.price_drop_started_at;
    NEW.current_price := COALESCE(public.compute_task_current_price(NEW.id), OLD.current_price);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tasks_guard_current_price ON public.tasks;
CREATE TRIGGER tasks_guard_current_price
BEFORE INSERT OR UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.guard_current_price();

-- 5) Varış kanıtı: mesafe sunucuda hesaplansın
DROP FUNCTION IF EXISTS public.mark_arrival(uuid, integer);

CREATE OR REPLACE FUNCTION public.mark_arrival(_task_id uuid, _lat double precision, _lng double precision)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  a_id uuid;
  t record;
  d integer;
BEGIN
  SELECT id INTO a_id FROM public.task_assignments
  WHERE task_id = _task_id AND tasker_id = auth.uid() AND status = 'accepted';

  IF a_id IS NULL THEN
    RAISE EXCEPTION 'Bu isin uzerinde degilsin';
  END IF;

  IF _lat IS NULL OR _lng IS NULL THEN RETURN false; END IF;

  SELECT latitude, longitude INTO t FROM public.tasks WHERE id = _task_id;
  IF t IS NULL THEN RETURN false; END IF;

  d := ROUND(
    6371000 * acos(
      LEAST(1, GREATEST(-1,
        cos(radians(_lat)) * cos(radians(t.latitude)) * cos(radians(t.longitude) - radians(_lng))
        + sin(radians(_lat)) * sin(radians(t.latitude))
      ))
    )
  )::integer;

  IF d > 300 THEN
    RETURN false;
  END IF;

  UPDATE public.task_assignments
  SET arrived_at = COALESCE(arrived_at, now()),
      arrival_distance_m = LEAST(COALESCE(arrival_distance_m, 999999), d)
  WHERE id = a_id;

  UPDATE public.tasks SET status = 'in_progress'
  WHERE id = _task_id AND status = 'matched';

  RETURN true;
END;
$function$;

-- 6) Kontenjan: kabul edilmiş teklifler de sayılsın + aynı kişi iki kez giremesin
CREATE OR REPLACE FUNCTION public.enforce_task_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  needed integer;
  taken integer;
BEGIN
  SELECT person_count INTO needed
  FROM public.tasks
  WHERE id = NEW.task_id
  FOR UPDATE;

  IF needed IS NULL THEN
    RAISE EXCEPTION 'Görev bulunamadı';
  END IF;

  SELECT
    (SELECT count(*) FROM public.task_assignments
       WHERE task_id = NEW.task_id AND status = 'accepted')
    + (SELECT count(*) FROM public.task_offers o
       WHERE o.task_id = NEW.task_id AND o.status = 'accepted'
         AND o.tasker_id <> NEW.tasker_id)
  INTO taken;

  IF taken >= needed THEN
    RAISE EXCEPTION 'Kontenjan dolu';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE UNIQUE INDEX IF NOT EXISTS task_assignments_unique_active
  ON public.task_assignments (task_id, tasker_id)
  WHERE status = 'accepted';

-- 7) Puanlama zorunlu: bekleyen değerlendirme varsa yeni iş açılamaz / kabul edilemez
CREATE OR REPLACE FUNCTION public.has_pending_reviews(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.task_assignments a ON a.task_id = t.id AND a.status = 'accepted'
    WHERE t.status = 'completed'
      AND (
        (t.owner_id = _user_id AND a.tasker_id <> _user_id AND NOT EXISTS (
          SELECT 1 FROM public.reviews r
          WHERE r.task_id = t.id AND r.reviewer_id = _user_id AND r.reviewee_id = a.tasker_id))
        OR
        (a.tasker_id = _user_id AND t.owner_id <> _user_id AND NOT EXISTS (
          SELECT 1 FROM public.reviews r
          WHERE r.task_id = t.id AND r.reviewer_id = _user_id AND r.reviewee_id = t.owner_id))
      )
  )
$function$;

CREATE OR REPLACE FUNCTION public.require_reviews_done()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
BEGIN
  uid := CASE WHEN TG_TABLE_NAME = 'tasks' THEN NEW.owner_id ELSE NEW.tasker_id END;
  IF uid IS NOT NULL AND public.has_pending_reviews(uid) THEN
    RAISE EXCEPTION 'Bekleyen degerlendirme var';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS tasks_require_reviews ON public.tasks;
CREATE TRIGGER tasks_require_reviews
BEFORE INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.require_reviews_done();

DROP TRIGGER IF EXISTS task_assignments_require_reviews ON public.task_assignments;
CREATE TRIGGER task_assignments_require_reviews
BEFORE INSERT ON public.task_assignments
FOR EACH ROW EXECUTE FUNCTION public.require_reviews_done();