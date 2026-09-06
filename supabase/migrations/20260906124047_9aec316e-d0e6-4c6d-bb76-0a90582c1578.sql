ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS id_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS id_verify_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS id_verify_last_attempt_at timestamptz;

CREATE OR REPLACE FUNCTION public.profile_system_snapshot(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'role', p.role::text,
    'credits', p.credits,
    'is_banned', p.is_banned,
    'rating', p.rating,
    'total_completed', p.total_completed,
    'cancel_count', p.cancel_count,
    'id_verification_status', p.id_verification_status,
    'id_verification_note', p.id_verification_note,
    'id_verified_at', p.id_verified_at,
    'id_verify_attempts', p.id_verify_attempts,
    'referral_code', p.referral_code
  )
  FROM public.profiles p
  WHERE p.user_id = _user_id
$$;

DROP POLICY IF EXISTS "Users can update safe profile fields" ON public.profiles;

CREATE POLICY "Users can update safe profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
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
  AND NOT (id_verified_at IS DISTINCT FROM ((public.profile_system_snapshot(auth.uid()) ->> 'id_verified_at')::timestamptz))
  AND NOT (id_verify_attempts IS DISTINCT FROM ((public.profile_system_snapshot(auth.uid()) ->> 'id_verify_attempts')::integer))
  AND NOT (referral_code IS DISTINCT FROM (public.profile_system_snapshot(auth.uid()) ->> 'referral_code'))
);