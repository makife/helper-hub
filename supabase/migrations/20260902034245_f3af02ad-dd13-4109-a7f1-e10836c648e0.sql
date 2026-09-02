DROP POLICY IF EXISTS "Users can update safe profile fields" ON public.profiles;

CREATE POLICY "Users can update safe profile fields"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND NOT ((role)::text IS DISTINCT FROM (public.profile_system_snapshot(auth.uid()) ->> 'role'))
  AND NOT (credits IS DISTINCT FROM ((public.profile_system_snapshot(auth.uid()) ->> 'credits')::integer))
  AND NOT (is_banned IS DISTINCT FROM ((public.profile_system_snapshot(auth.uid()) ->> 'is_banned')::boolean))
  AND NOT (rating IS DISTINCT FROM ((public.profile_system_snapshot(auth.uid()) ->> 'rating')::numeric))
  AND NOT (total_completed IS DISTINCT FROM ((public.profile_system_snapshot(auth.uid()) ->> 'total_completed')::integer))
  AND NOT (cancel_count IS DISTINCT FROM ((public.profile_system_snapshot(auth.uid()) ->> 'cancel_count')::integer))
  AND NOT (id_verification_status IS DISTINCT FROM (public.profile_system_snapshot(auth.uid()) ->> 'id_verification_status'))
  AND NOT (id_verification_note IS DISTINCT FROM (public.profile_system_snapshot(auth.uid()) ->> 'id_verification_note'))
  AND NOT (referral_code IS DISTINCT FROM (public.profile_system_snapshot(auth.uid()) ->> 'referral_code'))
);