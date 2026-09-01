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
    'referral_code', p.referral_code
  )
  FROM public.profiles p
  WHERE p.user_id = _user_id
$$;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update safe profile fields"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND role::text = public.profile_system_snapshot(auth.uid())->>'role'
    AND credits = (public.profile_system_snapshot(auth.uid())->>'credits')::integer
    AND is_banned = (public.profile_system_snapshot(auth.uid())->>'is_banned')::boolean
    AND rating = (public.profile_system_snapshot(auth.uid())->>'rating')::numeric
    AND total_completed = (public.profile_system_snapshot(auth.uid())->>'total_completed')::integer
    AND cancel_count = (public.profile_system_snapshot(auth.uid())->>'cancel_count')::integer
    AND id_verification_status = public.profile_system_snapshot(auth.uid())->>'id_verification_status'
    AND id_verification_note IS NOT DISTINCT FROM public.profile_system_snapshot(auth.uid())->>'id_verification_note'
    AND referral_code IS NOT DISTINCT FROM public.profile_system_snapshot(auth.uid())->>'referral_code'
  );

CREATE OR REPLACE FUNCTION public.task_lifecycle_snapshot(_task_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'owner_id', t.owner_id,
    'tasker_id', t.tasker_id,
    'status', t.status::text,
    'matched_at', t.matched_at,
    'completed_at', t.completed_at,
    'cancelled_at', t.cancelled_at,
    'completion_requested_at', t.completion_requested_at,
    'completion_requested_by', t.completion_requested_by,
    'expires_at', t.expires_at,
    'rejection_count', t.rejection_count,
    'disputed_at', t.disputed_at,
    'dispute_reason', t.dispute_reason,
    'last_rejected_at', t.last_rejected_at
  )
  FROM public.tasks t
  WHERE t.id = _task_id
$$;

DROP POLICY IF EXISTS "Owners can update own tasks" ON public.tasks;
CREATE POLICY "Owners can update open task details"
  ON public.tasks FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id AND status = 'open')
  WITH CHECK (
    auth.uid() = owner_id
    AND owner_id = (public.task_lifecycle_snapshot(id)->>'owner_id')::uuid
    AND tasker_id IS NOT DISTINCT FROM (public.task_lifecycle_snapshot(id)->>'tasker_id')::uuid
    AND status::text = public.task_lifecycle_snapshot(id)->>'status'
    AND matched_at IS NOT DISTINCT FROM (public.task_lifecycle_snapshot(id)->>'matched_at')::timestamptz
    AND completed_at IS NOT DISTINCT FROM (public.task_lifecycle_snapshot(id)->>'completed_at')::timestamptz
    AND cancelled_at IS NOT DISTINCT FROM (public.task_lifecycle_snapshot(id)->>'cancelled_at')::timestamptz
    AND completion_requested_at IS NOT DISTINCT FROM (public.task_lifecycle_snapshot(id)->>'completion_requested_at')::timestamptz
    AND completion_requested_by IS NOT DISTINCT FROM (public.task_lifecycle_snapshot(id)->>'completion_requested_by')::uuid
    AND expires_at IS NOT DISTINCT FROM (public.task_lifecycle_snapshot(id)->>'expires_at')::timestamptz
    AND rejection_count = (public.task_lifecycle_snapshot(id)->>'rejection_count')::integer
    AND disputed_at IS NOT DISTINCT FROM (public.task_lifecycle_snapshot(id)->>'disputed_at')::timestamptz
    AND dispute_reason IS NOT DISTINCT FROM public.task_lifecycle_snapshot(id)->>'dispute_reason'
    AND last_rejected_at IS NOT DISTINCT FROM (public.task_lifecycle_snapshot(id)->>'last_rejected_at')::timestamptz
    AND COALESCE(current_price, price) >= 0
    AND COALESCE(current_price, price) <= price
  );

DROP POLICY IF EXISTS "Taskers can update own assignment" ON public.task_assignments;
REVOKE UPDATE ON public.task_assignments FROM authenticated;

CREATE OR REPLACE FUNCTION public.confirm_task_completion(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE id = _task_id
      AND owner_id = auth.uid()
      AND status = 'pending_confirm'
  ) THEN
    RETURN false;
  END IF;

  UPDATE public.tasks
  SET status = 'completed', completed_at = now()
  WHERE id = _task_id;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_task(_task_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tasks
  SET status = 'cancelled', cancelled_at = now()
  WHERE id = _task_id
    AND owner_id = auth.uid()
    AND status IN ('open', 'matched', 'in_progress');
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.profile_system_snapshot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.task_lifecycle_snapshot(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_task_completion(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_task(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirm_task_completion(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_task(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_messages_task_created_at ON public.messages(task_id, created_at);
CREATE INDEX IF NOT EXISTS idx_task_assignments_tasker_status ON public.task_assignments(tasker_id, status);
CREATE INDEX IF NOT EXISTS idx_task_views_task_viewed_at ON public.task_views(task_id, viewed_at DESC);