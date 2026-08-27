CREATE TABLE public.task_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (task_id, viewer_id)
);

GRANT SELECT, INSERT, UPDATE ON public.task_views TO authenticated;
GRANT ALL ON public.task_views TO service_role;

ALTER TABLE public.task_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can record own views"
ON public.task_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can update own views"
ON public.task_views FOR UPDATE TO authenticated
USING (auth.uid() = viewer_id);

CREATE POLICY "Task owners can view viewers of own tasks"
ON public.task_views FOR SELECT TO authenticated
USING (
  auth.uid() = viewer_id
  OR EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND t.owner_id = auth.uid()
  )
);

CREATE INDEX idx_task_views_task ON public.task_views(task_id);