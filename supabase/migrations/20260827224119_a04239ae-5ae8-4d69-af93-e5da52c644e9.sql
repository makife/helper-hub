REVOKE EXECUTE ON FUNCTION public.enforce_single_active_assignment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_task_fill_status() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;