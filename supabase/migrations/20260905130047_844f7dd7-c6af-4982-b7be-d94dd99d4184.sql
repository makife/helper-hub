CREATE OR REPLACE FUNCTION public.cancel_task(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t record;
  a record;
  had_helper boolean := false;
  new_count integer;
  lang text;
BEGIN
  SELECT * INTO t FROM public.tasks
  WHERE id = _task_id
    AND owner_id = auth.uid()
    AND status IN ('open', 'matched', 'in_progress', 'pending_confirm');

  IF t IS NULL THEN
    RETURN false;
  END IF;

  FOR a IN
    SELECT * FROM public.task_assignments
    WHERE task_id = _task_id AND status = 'accepted'
  LOOP
    had_helper := true;

    UPDATE public.profiles
    SET credits = COALESCE(credits, 0) + 1
    WHERE user_id = a.tasker_id;

    INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
    VALUES (a.tasker_id, 1, 'refund', 'Task cancelled by owner after acceptance', _task_id);

    lang := public.get_user_language(a.tasker_id);
    INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
    VALUES (
      a.tasker_id, 'task_cancelled',
      CASE WHEN lang = 'en' THEN 'The job was cancelled' ELSE 'İş iptal edildi' END,
      COALESCE(t.title, CASE WHEN lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN lang = 'en' THEN ' - the requester cancelled after accepting you. Your credit has been refunded.'
             ELSE ' - iş veren seni kabul ettikten sonra iptal etti. Kredin iade edildi.' END,
      _task_id, t.owner_id
    );

    UPDATE public.task_assignments
    SET status = 'cancelled', updated_at = now()
    WHERE id = a.id;
  END LOOP;

  UPDATE public.tasks
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = _task_id;

  IF had_helper THEN
    UPDATE public.profiles
    SET cancel_count = COALESCE(cancel_count, 0) + 1
    WHERE user_id = t.owner_id
    RETURNING cancel_count INTO new_count;

    lang := public.get_user_language(t.owner_id);
    INSERT INTO public.notifications (user_id, type, title, body, task_id)
    VALUES (
      t.owner_id, 'task_cancelled',
      CASE WHEN lang = 'en' THEN 'Cancellation recorded' ELSE 'İptal siciline işlendi' END,
      COALESCE(t.title, CASE WHEN lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
        CASE WHEN lang = 'en' THEN ' - you cancelled after a helper was accepted (' || COALESCE(new_count, 0) || '/3). At 3 your account is suspended.'
             ELSE ' - el atan kabul edildikten sonra iptal ettin (' || COALESCE(new_count, 0) || '/3). 3''e ulaşınca hesabın askıya alınır.' END,
      _task_id
    );

    IF COALESCE(new_count, 0) >= 3 THEN
      UPDATE public.profiles SET is_banned = true WHERE user_id = t.owner_id;
      INSERT INTO public.notifications (user_id, type, title, body, task_id)
      VALUES (
        t.owner_id, 'account_suspended',
        CASE WHEN lang = 'en' THEN 'Your account has been suspended' ELSE 'Hesabın askıya alındı' END,
        CASE WHEN lang = 'en' THEN 'You cancelled 3 jobs after a helper was accepted.'
             ELSE 'El atan kabul edildikten sonra 3 işi iptal ettin.' END,
        _task_id
      );
    END IF;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_task(uuid) TO authenticated, service_role;