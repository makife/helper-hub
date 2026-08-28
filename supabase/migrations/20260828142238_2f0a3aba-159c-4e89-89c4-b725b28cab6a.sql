REVOKE ALL ON FUNCTION public.dispatch_push(uuid, text, text, text) FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.push_on_notification() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.push_on_message() FROM anon, authenticated, public;
REVOKE ALL ON TABLE public.push_config FROM anon, authenticated;