CREATE OR REPLACE FUNCTION public.test_grant_credits(_credits integer, _pack text DEFAULT 'test')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today integer;
  _new integer;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _credits IS NULL OR _credits <= 0 OR _credits > 200 THEN
    RAISE EXCEPTION 'invalid amount';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO _today
  FROM public.credit_transactions
  WHERE user_id = _uid AND kind = 'test_purchase' AND created_at > now() - interval '1 day';

  IF _today + _credits > 500 THEN
    RAISE EXCEPTION 'daily test limit reached';
  END IF;

  UPDATE public.profiles
  SET credits = COALESCE(credits, 0) + _credits
  WHERE user_id = _uid
  RETURNING credits INTO _new;

  INSERT INTO public.credit_transactions (user_id, amount, kind, description)
  VALUES (_uid, _credits, 'test_purchase', 'Web test purchase: ' || _pack);

  RETURN _new;
END;
$$;

REVOKE ALL ON FUNCTION public.test_grant_credits(integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.test_grant_credits(integer, text) TO authenticated;