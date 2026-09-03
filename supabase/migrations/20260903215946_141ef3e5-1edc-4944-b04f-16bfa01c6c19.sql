CREATE OR REPLACE FUNCTION public.respond_to_offer(_offer_id uuid, _accept boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  o record; t record; lang text; taken integer; needed integer;
BEGIN
  SELECT * INTO o FROM public.task_offers WHERE id = _offer_id FOR UPDATE;
  IF o IS NULL THEN RETURN 'not_found'; END IF;

  SELECT * INTO t FROM public.tasks WHERE id = o.task_id FOR UPDATE;
  IF t.owner_id <> auth.uid() THEN RETURN 'not_owner'; END IF;
  IF o.status <> 'pending' THEN RETURN 'bad_status'; END IF;
  IF t.status <> 'open' THEN RETURN 'task_closed'; END IF;

  IF _accept THEN
    needed := COALESCE(t.person_count, 1);
    SELECT
      (SELECT count(*) FROM public.task_offers x
         WHERE x.task_id = o.task_id AND x.status IN ('accepted','confirmed'))
      + (SELECT count(*) FROM public.task_assignments a
         WHERE a.task_id = o.task_id AND a.status = 'accepted'
           AND NOT EXISTS (SELECT 1 FROM public.task_offers y
              WHERE y.task_id = a.task_id AND y.tasker_id = a.tasker_id AND y.status = 'confirmed'))
    INTO taken;

    IF taken >= needed THEN
      RETURN 'quota_full';
    END IF;
  END IF;

  UPDATE public.task_offers
  SET status = CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END,
      responded_at = now()
  WHERE id = _offer_id;

  lang := public.get_user_language(o.tasker_id);
  INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
  VALUES (
    o.tasker_id,
    CASE WHEN _accept THEN 'offer_accepted' ELSE 'offer_rejected' END,
    CASE WHEN _accept
      THEN CASE WHEN lang = 'en' THEN 'Your offer was accepted' ELSE 'Teklifin kabul edildi' END
      ELSE CASE WHEN lang = 'en' THEN 'Your offer was declined' ELSE 'Teklifin reddedildi' END END,
    COALESCE(t.title, CASE WHEN lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
      CASE WHEN _accept
        THEN CASE WHEN lang = 'en' THEN ' - confirm to start the job' ELSE ' - işi başlatmak için onayla' END
        ELSE CASE WHEN lang = 'en' THEN ' - you can still accept at the listed price' ELSE ' - ilan fiyatından yine de kabul edebilirsin' END END,
    o.task_id, t.owner_id
  );

  RETURN CASE WHEN _accept THEN 'accepted' ELSE 'rejected' END;
END;
$function$;