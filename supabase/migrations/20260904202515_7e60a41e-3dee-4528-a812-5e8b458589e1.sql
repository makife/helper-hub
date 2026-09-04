-- 1) Fix mutable search_path
ALTER FUNCTION public.generate_referral_code() SET search_path = public;
ALTER FUNCTION public.set_referral_code_on_profile() SET search_path = public;
ALTER FUNCTION public.guard_id_verification_status() SET search_path = public;
ALTER FUNCTION public.set_wait_deadline() SET search_path = public;
ALTER FUNCTION public.nearby_helper_ids(double precision, double precision, double precision, uuid) SET search_path = public;

-- 2) Remove anon access to every public table (app requires sign-in)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', r.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM authenticated', r.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', r.tablename);
  END LOOP;
END $$;

-- 3) Re-grant least privilege to authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credentials TO authenticated;
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.reviews TO authenticated;
GRANT SELECT, INSERT ON public.sos_alerts TO authenticated;
GRANT SELECT ON public.store_purchases TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.task_assignments TO authenticated;
GRANT SELECT, INSERT ON public.task_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.task_views TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tasks TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_reports TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- 4) Lock down function execution
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.cancel_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_unfilled_task(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_accepted_offer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_task_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_arrival(uuid, double precision, double precision) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_task_completion(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_task_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_offer(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_task_with_partial_quota(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_grant_credits(integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_pending_reviews(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_system_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.task_lifecycle_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.compute_task_current_price(uuid) TO authenticated;