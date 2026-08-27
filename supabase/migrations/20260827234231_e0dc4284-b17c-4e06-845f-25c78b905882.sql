ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profession text;

CREATE TABLE public.credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credentials TO authenticated;
GRANT SELECT ON public.credentials TO anon;
GRANT ALL ON public.credentials TO service_role;
ALTER TABLE public.credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Credentials viewable by everyone" ON public.credentials FOR SELECT USING (true);
CREATE POLICY "Users can add own credentials" ON public.credentials FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credentials" ON public.credentials FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credentials" ON public.credentials FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON public.credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  kind text NOT NULL DEFAULT 'purchase',
  description text,
  task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own credit transactions" ON public.credit_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit transactions" ON public.credit_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);
CREATE INDEX idx_credentials_user ON public.credentials(user_id);

CREATE OR REPLACE FUNCTION public.charge_credit_on_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_credits integer;
BEGIN
  SELECT credits INTO current_credits FROM public.profiles WHERE user_id = NEW.tasker_id FOR UPDATE;

  IF current_credits IS NULL THEN
    RAISE EXCEPTION 'Profil bulunamadi';
  END IF;

  IF current_credits < 1 THEN
    RAISE EXCEPTION 'Yetersiz kredi';
  END IF;

  UPDATE public.profiles SET credits = credits - 1 WHERE user_id = NEW.tasker_id;

  INSERT INTO public.credit_transactions (user_id, amount, kind, description, task_id)
  VALUES (NEW.tasker_id, -1, 'spend', 'Yardim cagrisi kabulu', NEW.task_id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER task_assignments_charge_credit
BEFORE INSERT ON public.task_assignments
FOR EACH ROW EXECUTE FUNCTION public.charge_credit_on_assignment();

CREATE OR REPLACE FUNCTION public.recalc_profile_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles p
  SET rating = COALESCE((SELECT round(avg(r.rating)::numeric, 1) FROM public.reviews r WHERE r.reviewee_id = NEW.reviewee_id), 0)
  WHERE p.user_id = NEW.reviewee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER reviews_recalc_rating
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.recalc_profile_rating();

CREATE OR REPLACE FUNCTION public.bump_completed_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    UPDATE public.profiles SET total_completed = COALESCE(total_completed, 0) + 1
    WHERE user_id = NEW.owner_id;

    UPDATE public.profiles SET total_completed = COALESCE(total_completed, 0) + 1
    WHERE user_id IN (
      SELECT tasker_id FROM public.task_assignments WHERE task_id = NEW.id AND status = 'accepted'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_bump_completed
AFTER UPDATE ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.bump_completed_counts();