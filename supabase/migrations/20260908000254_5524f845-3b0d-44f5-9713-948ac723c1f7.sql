CREATE OR REPLACE FUNCTION public.process_offer_confirm_deadlines()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  tasker_name text;
BEGIN
  FOR r IN
    SELECT o.id, o.task_id, o.tasker_id, t.owner_id, t.title
    FROM public.task_offers o
    JOIN public.tasks t ON t.id = o.task_id
    WHERE o.status = 'accepted'
      AND o.responded_at IS NOT NULL
      AND o.responded_at < now() - interval '15 minutes'
      AND t.status::text = 'open'
      AND NOT EXISTS (
        SELECT 1 FROM public.task_assignments a
        WHERE a.task_id = o.task_id AND a.tasker_id = o.tasker_id AND a.status = 'accepted'
      )
  LOOP
    UPDATE public.task_offers
    SET status = 'expired', responded_at = now()
    WHERE id = r.id AND status = 'accepted';

    SELECT full_name INTO tasker_name FROM public.profiles WHERE user_id = r.tasker_id;

    UPDATE public.profiles
    SET no_show_count = COALESCE(no_show_count, 0) + 1
    WHERE user_id = r.tasker_id;

    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (
      r.tasker_id,
      'offer_confirm_expired',
      'Onay suren doldu',
      '15 dakika icinde onaylamadigin icin ' || COALESCE(r.title, 'is') || ' uzerindeki hakkin dustu.',
      r.task_id,
      r.owner_id
    );

    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (
      r.owner_id,
      'offer_confirm_expired',
      'El atan zamaninda onaylamadi',
      COALESCE(tasker_name, 'El atan kisi') || ' 15 dakika icinde onaylamadi. Cagrin tekrar acik, baskalari el atabilir.',
      r.task_id,
      r.tasker_id
    );
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.process_offer_confirm_deadlines() FROM anon, authenticated, public;