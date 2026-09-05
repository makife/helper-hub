DROP POLICY "Users can send messages" ON public.messages;

CREATE POLICY "Users can send messages on active tasks"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id
      AND t.status IN ('matched','in_progress','pending_confirm')
  )
);