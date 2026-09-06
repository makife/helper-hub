CREATE TABLE public.verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('id_card','selfie','criminal_record','skill')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  file_path text,
  reviewer_id uuid,
  review_note text,
  attempts integer NOT NULL DEFAULT 1,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind)
);

GRANT SELECT, INSERT, UPDATE ON public.verification_requests TO authenticated;
GRANT ALL ON public.verification_requests TO service_role;

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verification requests"
ON public.verification_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create own verification requests"
ON public.verification_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND status = 'pending' AND reviewer_id IS NULL);

CREATE POLICY "Users resubmit own unapproved requests"
ON public.verification_requests FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND status <> 'approved')
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins review verification requests"
ON public.verification_requests FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_verification_requests_updated_at
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Kullanıcı kendi başvurusunu onaylayamasın
CREATE OR REPLACE FUNCTION public.guard_verification_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      NEW.reviewer_id := auth.uid();
      NEW.reviewed_at := now();
    END IF;
    RETURN NEW;
  END IF;
  NEW.status := 'pending';
  NEW.reviewer_id := OLD.reviewer_id;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.review_note := OLD.review_note;
  IF NEW.file_path IS DISTINCT FROM OLD.file_path THEN
    NEW.attempts := COALESCE(OLD.attempts, 0) + 1;
  END IF;
  IF COALESCE(NEW.attempts, 1) > 5 THEN
    RAISE EXCEPTION 'too_many_attempts';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_verification_status_trg
BEFORE UPDATE ON public.verification_requests
FOR EACH ROW EXECUTE FUNCTION public.guard_verification_status();

-- Yeni başvuruda adminlere bildirim
CREATE OR REPLACE FUNCTION public.notify_admins_on_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, body, actor_id)
  SELECT ur.user_id, 'verification_request', 'Yeni güven doğrulama başvurusu',
         'Bir kullanıcı belge yükledi, incelemeni bekliyor.', NEW.user_id
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_admins_on_verification_insert
AFTER INSERT ON public.verification_requests
FOR EACH ROW WHEN (NEW.file_path IS NOT NULL)
EXECUTE FUNCTION public.notify_admins_on_verification();

CREATE TRIGGER notify_admins_on_verification_update
AFTER UPDATE OF file_path ON public.verification_requests
FOR EACH ROW WHEN (NEW.file_path IS DISTINCT FROM OLD.file_path AND NEW.file_path IS NOT NULL)
EXECUTE FUNCTION public.notify_admins_on_verification();

-- Güven puanı: telefon + onaylanan belgeler (0-5)
CREATE OR REPLACE FUNCTION public.trust_score(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT CASE WHEN p.phone IS NOT NULL AND length(trim(p.phone)) > 0 THEN 1 ELSE 0 END
       FROM public.profiles p WHERE p.user_id = _user_id)
    +
    (SELECT count(*)::int FROM public.verification_requests v
      WHERE v.user_id = _user_id AND v.status = 'approved');
$$;

GRANT EXECUTE ON FUNCTION public.trust_score(uuid) TO authenticated, anon;