CREATE TABLE public.task_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  tasker_id uuid NOT NULL,
  amount integer NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'pending',
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, tasker_id)
);

GRANT SELECT, INSERT ON public.task_offers TO authenticated;
GRANT ALL ON public.task_offers TO service_role;

ALTER TABLE public.task_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Taskers can create one offer"
ON public.task_offers FOR INSERT TO authenticated
WITH CHECK (
  tasker_id = auth.uid()
  AND status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
      AND t.owner_id <> auth.uid()
      AND t.status = 'open'
      AND amount > t.price
  )
);

CREATE POLICY "Taskers can view own offers"
ON public.task_offers FOR SELECT TO authenticated
USING (tasker_id = auth.uid());

CREATE POLICY "Owners can view offers on their tasks"
ON public.task_offers FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.owner_id = auth.uid()));

CREATE TRIGGER update_task_offers_updated_at
BEFORE UPDATE ON public.task_offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Yeni teklif geldiğinde çağrı sahibine bildirim
CREATE OR REPLACE FUNCTION public.notify_offer_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t record; actor_name text; lang text;
BEGIN
  SELECT owner_id, title, currency INTO t FROM public.tasks WHERE id = NEW.task_id;
  SELECT full_name INTO actor_name FROM public.profiles WHERE user_id = NEW.tasker_id;
  lang := public.get_user_language(t.owner_id);

  INSERT INTO public.notifications (user_id, type, title, body, task_id, actor_id)
  VALUES (
    t.owner_id, 'offer_received',
    CASE WHEN lang = 'en' THEN COALESCE(actor_name, 'A user') || ' sent an offer'
         ELSE COALESCE(actor_name, 'Bir kullanıcı') || ' teklif gönderdi' END,
    COALESCE(t.title, CASE WHEN lang = 'en' THEN 'Help request' ELSE 'Yardım çağrısı' END) ||
      CASE WHEN lang = 'en' THEN ' - offer: ' ELSE ' - teklif: ' END || NEW.amount::text || ' ' || COALESCE(t.currency, 'TRY'),
    NEW.task_id, NEW.tasker_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER task_offers_notify_insert
AFTER INSERT ON public.task_offers
FOR EACH ROW EXECUTE FUNCTION public.notify_offer_created();

-- Çağrı sahibi teklife yanıt verir
CREATE OR REPLACE FUNCTION public.respond_to_offer(_offer_id uuid, _accept boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o record; t record; lang text;
BEGIN
  SELECT * INTO o FROM public.task_offers WHERE id = _offer_id FOR UPDATE;
  IF o IS NULL THEN RETURN 'not_found'; END IF;

  SELECT * INTO t FROM public.tasks WHERE id = o.task_id;
  IF t.owner_id <> auth.uid() THEN RETURN 'not_owner'; END IF;
  IF o.status <> 'pending' THEN RETURN 'bad_status'; END IF;
  IF t.status <> 'open' THEN RETURN 'task_closed'; END IF;

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
$$;

-- El atan kabul edilen teklifi onaylar ve işe atanır
CREATE OR REPLACE FUNCTION public.confirm_accepted_offer(_offer_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  o record; t record; new_assignment_id uuid;
BEGIN
  SELECT * INTO o FROM public.task_offers WHERE id = _offer_id FOR UPDATE;
  IF o IS NULL THEN RETURN 'not_found'; END IF;
  IF o.tasker_id <> auth.uid() THEN RETURN 'not_owner'; END IF;
  IF o.status <> 'accepted' THEN RETURN 'bad_status'; END IF;

  SELECT * INTO t FROM public.tasks WHERE id = o.task_id;
  IF t.status <> 'open' THEN RETURN 'task_closed'; END IF;

  INSERT INTO public.task_assignments (task_id, tasker_id, agreed_price, status)
  VALUES (o.task_id, o.tasker_id, o.amount, 'accepted')
  RETURNING id INTO new_assignment_id;

  UPDATE public.task_assignments SET agreed_price = o.amount WHERE id = new_assignment_id;
  UPDATE public.task_offers SET status = 'confirmed', responded_at = now() WHERE id = _offer_id;

  RETURN 'ok';
END;
$$;
