CREATE OR REPLACE FUNCTION public.notify_offer_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record; actor_name text; lang text; is_request boolean;
BEGIN
  SELECT owner_id, title, currency, price, COALESCE(current_price, price) AS cur
    INTO t FROM public.tasks WHERE id = NEW.task_id;
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.tasker_id;
  lang := public.get_user_language(t.owner_id);
  is_request := NEW.amount <= COALESCE(t.cur, t.price);

  IF is_request THEN
    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (
      t.owner_id, 'offer_received',
      CASE WHEN lang = 'en' THEN COALESCE(actor_name, 'A user') || ' wants to take your task'
           ELSE COALESCE(actor_name, 'Bir kullanıcı') || ' işini almak istiyor' END,
      COALESCE(t.title, CASE WHEN lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN lang = 'en' THEN ' - review the profile and approve' ELSE ' - profilini inceleyip onaylayabilirsin' END,
      NEW.task_id, NEW.tasker_id
    );
  ELSE
    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (
      t.owner_id, 'offer_received',
      CASE WHEN lang = 'en' THEN COALESCE(actor_name, 'A user') || ' sent an offer'
           ELSE COALESCE(actor_name, 'Bir kullanıcı') || ' teklif gönderdi' END,
      COALESCE(t.title, CASE WHEN lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN lang = 'en' THEN ' - offer: ' ELSE ' - teklif: ' END || NEW.amount::text || ' ' || COALESCE(t.currency, 'TRY'),
      NEW.task_id, NEW.tasker_id
    );
  END IF;
  RETURN NEW;
END;
$$;