DROP POLICY "Taskers can create one offer" ON public.task_offers;
CREATE POLICY "Taskers can create one offer" ON public.task_offers
FOR INSERT TO authenticated
WITH CHECK (
  tasker_id = auth.uid()
  AND status = 'pending'
  AND amount > 0
  AND EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_offers.task_id
      AND t.owner_id <> auth.uid()
      AND t.status = 'open'
  )
);