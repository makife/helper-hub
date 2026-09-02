CREATE OR REPLACE FUNCTION public.get_user_language(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE WHEN COALESCE(language, 'tr') = 'en' THEN 'en' ELSE 'tr' END
  FROM public.profiles
  WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.notify_assignment_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t_owner uuid;
  t_title text;
  actor_name text;
  recipient_lang text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT owner_id, title INTO t_owner, t_title FROM public.tasks WHERE id = NEW.task_id;
    SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.tasker_id;
    recipient_lang := public.get_user_language(t_owner);
    IF t_owner IS NOT NULL AND t_owner <> NEW.tasker_id THEN
      INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
      VALUES (
        t_owner, 'assignment_accepted',
        CASE WHEN recipient_lang = 'en' THEN COALESCE(actor_name, 'A user') || ' accepted your request'
             ELSE COALESCE(actor_name, 'Bir kullanıcı') || ' çağrını kabul etti' END,
        COALESCE(t_title, CASE WHEN recipient_lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END),
        NEW.task_id, NEW.tasker_id
      );
    END IF;
    RETURN NEW;
  END IF;

  SELECT owner_id, title INTO t_owner, t_title FROM public.tasks WHERE id = OLD.task_id;
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = OLD.tasker_id;
  recipient_lang := public.get_user_language(t_owner);
  IF t_owner IS NOT NULL AND t_owner <> OLD.tasker_id THEN
    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (
      t_owner, 'assignment_left',
      CASE WHEN recipient_lang = 'en' THEN COALESCE(actor_name, 'A user') || ' left the task'
           ELSE COALESCE(actor_name, 'Bir kullanıcı') || ' işi bıraktı' END,
      COALESCE(t_title, CASE WHEN recipient_lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END),
      OLD.task_id, OLD.tasker_id
    );
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recipient_lang text;
BEGIN
  IF NEW.status::text = 'completed' AND OLD.status::text IS DISTINCT FROM 'completed' THEN
    recipient_lang := public.get_user_language(NEW.owner_id);
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (
      NEW.owner_id, 'task_completed',
      CASE WHEN recipient_lang = 'en' THEN 'Task completed' ELSE 'İş tamamlandı' END,
      COALESCE(NEW.title, CASE WHEN recipient_lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN recipient_lang = 'en' THEN ' - leave a review' ELSE ' - değerlendirme yap' END,
      NEW.id
    );

    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    SELECT a.tasker_id, 'task_completed',
      CASE WHEN public.get_user_language(a.tasker_id) = 'en' THEN 'Task completed' ELSE 'İş tamamlandı' END,
      COALESCE(NEW.title, CASE WHEN public.get_user_language(a.tasker_id) = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN public.get_user_language(a.tasker_id) = 'en' THEN ' - leave a review' ELSE ' - değerlendirme yap' END,
      NEW.id
    FROM public.task_assignments a
    WHERE a.task_id = NEW.id AND a.status = 'accepted';

  ELSIF NEW.status::text = 'pending_confirm' AND OLD.status::text IS DISTINCT FROM 'pending_confirm' THEN
    recipient_lang := public.get_user_language(NEW.owner_id);
    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (
      NEW.owner_id, 'completion_requested',
      CASE WHEN recipient_lang = 'en' THEN 'Task marked as finished' ELSE 'İş bitti olarak işaretlendi' END,
      COALESCE(NEW.title, CASE WHEN recipient_lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN recipient_lang = 'en' THEN ' - it will be completed automatically if you do not confirm within 24 hours'
             ELSE ' - 24 saat içinde onaylamazsan otomatik tamamlanacak' END,
      NEW.id, NEW.completion_requested_by
    );

  ELSIF NEW.status::text = 'expired' AND OLD.status::text IS DISTINCT FROM 'expired' THEN
    recipient_lang := public.get_user_language(NEW.owner_id);
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (
      NEW.owner_id, 'task_expired',
      CASE WHEN recipient_lang = 'en' THEN 'Your help request expired' ELSE 'Yardım çağrının süresi doldu' END,
      COALESCE(NEW.title, CASE WHEN recipient_lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN recipient_lang = 'en' THEN ' - no helper joined, your credit was refunded'
             ELSE ' - kimse el atmadı, kredin iade edildi' END,
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_dispute(_task_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t record;
  a record;
  guilty uuid;
  new_count integer;
  recipient_lang text;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task_id;
  IF t IS NULL THEN RETURN; END IF;

  SELECT * INTO a FROM public.task_assignments
  WHERE task_id = _task_id AND status = 'accepted'
  ORDER BY created_at ASC LIMIT 1;

  IF a.arrived_at IS NOT NULL THEN
    guilty := t.owner_id;
    UPDATE public.profiles SET credits = COALESCE(credits, 0) + 1 WHERE user_id = a.tasker_id;
    INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
    VALUES (a.tasker_id, 1, 'refund', 'Dispute resolution - arrival proof verified', _task_id);

    recipient_lang := public.get_user_language(a.tasker_id);
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (
      a.tasker_id, 'dispute_resolved',
      CASE WHEN recipient_lang = 'en' THEN 'Dispute resolved in your favour' ELSE 'Anlaşmazlık lehine sonuçlandı' END,
      COALESCE(t.title, CASE WHEN recipient_lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN recipient_lang = 'en' THEN ' - your arrival was verified and your credit was refunded'
             ELSE ' - varış kanıtın doğrulandı, kredin iade edildi' END,
      _task_id
    );
  ELSE
    guilty := a.tasker_id;
    recipient_lang := public.get_user_language(t.owner_id);
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (
      t.owner_id, 'dispute_resolved',
      CASE WHEN recipient_lang = 'en' THEN 'Dispute resolved in your favour' ELSE 'Anlaşmazlık lehine sonuçlandı' END,
      COALESCE(t.title, CASE WHEN recipient_lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN recipient_lang = 'en' THEN ' - no arrival proof was found' ELSE ' - varış kanıtı bulunamadı' END,
      _task_id
    );
    UPDATE public.profiles SET credits = COALESCE(credits, 0) + 1 WHERE user_id = t.owner_id;
    INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
    VALUES (t.owner_id, 1, 'refund', 'Dispute resolution - task not completed', _task_id);
  END IF;

  IF guilty IS NOT NULL THEN
    UPDATE public.profiles
    SET cancel_count = COALESCE(cancel_count, 0) + 1
    WHERE user_id = guilty
    RETURNING cancel_count INTO new_count;

    IF COALESCE(new_count, 0) >= 3 THEN
      UPDATE public.profiles SET is_banned = true WHERE user_id = guilty;
    END IF;

    recipient_lang := public.get_user_language(guilty);
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (
      guilty, 'dispute_resolved',
      CASE WHEN recipient_lang = 'en' THEN 'Dispute resolved against you' ELSE 'Anlaşmazlık aleyhine sonuçlandı' END,
      COALESCE(t.title, CASE WHEN recipient_lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN recipient_lang = 'en' THEN ' - this was added to your record (' || COALESCE(new_count, 0) || '/3)'
             ELSE ' - siciline kayıt işlendi (' || COALESCE(new_count, 0) || '/3)' END,
      _task_id
    );
  END IF;

  UPDATE public.tasks
  SET status = 'cancelled', cancelled_at = now(), disputed_at = COALESCE(disputed_at, now())
  WHERE id = _task_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_task_completion(_task_id uuid, _reason text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t record;
  a record;
  new_rejections integer;
  recipient_lang text;
BEGIN
  SELECT * INTO t FROM public.tasks WHERE id = _task_id;
  IF t IS NULL OR t.owner_id <> auth.uid() THEN RETURN 'not_owner'; END IF;
  IF t.status::text <> 'pending_confirm' THEN RETURN 'bad_status'; END IF;
  SELECT * INTO a FROM public.task_assignments WHERE task_id = _task_id AND status = 'accepted' ORDER BY created_at ASC LIMIT 1;
  new_rejections := COALESCE(t.rejection_count, 0) + 1;

  IF new_rejections >= 2 THEN
    UPDATE public.tasks SET rejection_count = new_rejections, status = 'disputed', disputed_at = now(),
      dispute_reason = COALESCE(_reason, t.dispute_reason), last_rejected_at = now() WHERE id = _task_id;
    PERFORM public.resolve_dispute(_task_id);
    RETURN 'disputed';
  END IF;

  UPDATE public.tasks SET rejection_count = new_rejections, status = 'in_progress', completion_requested_at = NULL,
    completion_requested_by = NULL, dispute_reason = COALESCE(_reason, t.dispute_reason), last_rejected_at = now() WHERE id = _task_id;

  IF a.tasker_id IS NOT NULL THEN
    recipient_lang := public.get_user_language(a.tasker_id);
    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (
      a.tasker_id, 'completion_rejected',
      CASE WHEN recipient_lang = 'en' THEN 'Task was marked incomplete' ELSE 'İş tamamlanmadı olarak işaretlendi' END,
      COALESCE(t.title, CASE WHEN recipient_lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN recipient_lang = 'en' THEN ' - the requester objected. You can complete it and try again.'
             ELSE ' - iş veren itiraz etti. Tamamlayıp tekrar bildirebilirsin.' END,
      _task_id, t.owner_id
    );
  END IF;
  RETURN 'rejected';
END;
$$;