REVOKE ALL ON FUNCTION public.mark_arrival(uuid, integer) FROM public, anon;
REVOKE ALL ON FUNCTION public.request_task_completion(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.reject_task_completion(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_arrival(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_task_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_task_completion(uuid, text) TO authenticated;