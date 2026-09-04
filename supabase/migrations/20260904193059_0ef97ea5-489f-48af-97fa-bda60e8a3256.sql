CREATE TABLE public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own blocks select" ON public.user_blocks FOR SELECT TO authenticated USING (blocker_id = auth.uid());
CREATE POLICY "own blocks insert" ON public.user_blocks FOR INSERT TO authenticated WITH CHECK (blocker_id = auth.uid() AND blocked_id <> auth.uid());
CREATE POLICY "own blocks delete" ON public.user_blocks FOR DELETE TO authenticated USING (blocker_id = auth.uid());

CREATE TABLE public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reported_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  reason text not null,
  details text,
  status text not null default 'open',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.user_reports TO authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports select" ON public.user_reports FOR SELECT TO authenticated USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "own reports insert" ON public.user_reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid() AND reported_id <> auth.uid());
CREATE POLICY "admin reports update" ON public.user_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_messages boolean not null default true,
  ADD COLUMN IF NOT EXISTS notify_task_updates boolean not null default true,
  ADD COLUMN IF NOT EXISTS notify_offers boolean not null default true;

CREATE OR REPLACE FUNCTION public.push_on_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  sender_name text;
  allowed boolean;
BEGIN
  SELECT COALESCE(notify_messages, true) INTO allowed FROM public.profiles WHERE user_id = NEW.receiver_id;
  IF allowed IS FALSE THEN RETURN NEW; END IF;
  SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  PERFORM public.dispatch_push(NEW.receiver_id,
    COALESCE(sender_name, 'Yeni mesaj'),
    LEFT(NEW.content, 120),
    '/task/' || NEW.task_id::text);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.push_on_notification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  p record;
BEGIN
  SELECT COALESCE(notify_task_updates, true) AS upd, COALESCE(notify_offers, true) AS off
  INTO p FROM public.profiles WHERE user_id = NEW.user_id;

  IF p IS NOT NULL THEN
    IF NEW.type LIKE 'offer%' AND p.off IS FALSE THEN RETURN NEW; END IF;
    IF NEW.type NOT LIKE 'offer%' AND p.upd IS FALSE THEN RETURN NEW; END IF;
  END IF;

  PERFORM public.dispatch_push(NEW.user_id, NEW.title, NEW.body,
    CASE WHEN NEW.task_id IS NOT NULL THEN '/my-tasks?task=' || NEW.task_id::text ELSE '/notifications' END);
  RETURN NEW;
END;
$function$;