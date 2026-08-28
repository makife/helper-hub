CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT ALL ON public.device_tokens TO service_role;

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own device tokens"
ON public.device_tokens FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_device_tokens_user ON public.device_tokens(user_id);

CREATE TRIGGER update_device_tokens_updated_at
BEFORE UPDATE ON public.device_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.push_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  function_url text NOT NULL,
  hook_secret text NOT NULL
);

GRANT ALL ON public.push_config TO service_role;
ALTER TABLE public.push_config ENABLE ROW LEVEL SECURITY;

INSERT INTO public.push_config (function_url, hook_secret)
VALUES ('https://idronsyojlzeoebuzwsd.supabase.co/functions/v1/send-push',
        '8ad2cd08f443ec1c2e334d0877b7abc7b4e0530509f72230');

CREATE OR REPLACE FUNCTION public.dispatch_push(_user_id uuid, _title text, _body text, _path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  cfg record;
BEGIN
  SELECT * INTO cfg FROM public.push_config LIMIT 1;
  IF cfg IS NULL OR _user_id IS NULL THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := cfg.function_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', cfg.hook_secret),
    body := jsonb_build_object('user_id', _user_id, 'title', _title, 'body', COALESCE(_body, ''), 'path', COALESCE(_path, '/'))
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.push_on_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  PERFORM public.dispatch_push(NEW.user_id, NEW.title, NEW.body,
    CASE WHEN NEW.task_id IS NOT NULL THEN '/task/' || NEW.task_id::text ELSE '/notifications' END);
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.push_on_notification();

CREATE OR REPLACE FUNCTION public.push_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT full_name INTO sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  PERFORM public.dispatch_push(NEW.receiver_id,
    COALESCE(sender_name, 'Yeni mesaj'),
    LEFT(NEW.content, 120),
    '/task/' || NEW.task_id::text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_push
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.push_on_message();