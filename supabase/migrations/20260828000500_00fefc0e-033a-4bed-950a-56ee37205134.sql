CREATE OR REPLACE FUNCTION public.charge_credit_on_task_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_credits integer;
BEGIN
  SELECT credits INTO current_credits FROM public.profiles WHERE user_id = NEW.owner_id FOR UPDATE;

  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'Profil bulunamadi';
  END IF;

  IF current_credits < 1 THEN
    RAISE EXCEPTION 'Yetersiz kredi';
  END IF;

  UPDATE public.profiles SET credits = credits - 1 WHERE user_id = NEW.owner_id;

  INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
  VALUES (NEW.owner_id, -1, 'spend', 'Yardim cagrisi olusturma', NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_charge_credit
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.charge_credit_on_task_create();