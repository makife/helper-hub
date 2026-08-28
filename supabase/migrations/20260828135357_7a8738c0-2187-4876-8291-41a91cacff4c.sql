CREATE TABLE public.store_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  credits integer NOT NULL DEFAULT 0,
  event_type text NOT NULL,
  store text,
  price numeric,
  currency text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.store_purchases TO authenticated;
GRANT ALL ON public.store_purchases TO service_role;

ALTER TABLE public.store_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store purchases"
ON public.store_purchases FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX idx_store_purchases_user ON public.store_purchases(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.grant_store_credits(
  _event_id text,
  _user_id uuid,
  _product_id text,
  _credits integer,
  _event_type text,
  _store text,
  _price numeric,
  _currency text,
  _raw jsonb
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.store_purchases WHERE event_id = _event_id) THEN
    RETURN 'duplicate';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id) THEN
    RETURN 'no_user';
  END IF;

  INSERT INTO public.store_purchases (event_id, user_id, product_id, credits, event_type, store, price, currency, raw)
  VALUES (_event_id, _user_id, _product_id, _credits, _event_type, _store, _price, _currency, _raw);

  IF _credits <> 0 THEN
    UPDATE public.profiles
    SET credits = GREATEST(COALESCE(credits, 0) + _credits, 0)
    WHERE user_id = _user_id;

    INSERT INTO public.credit_transactions (user_id, amount, kind, description)
    VALUES (
      _user_id,
      _credits,
      CASE WHEN _credits > 0 THEN 'purchase' ELSE 'refund' END,
      CASE WHEN _credits > 0
        THEN _product_id || ' paketi satın alındı'
        ELSE _product_id || ' paketi iade edildi'
      END
    );
  END IF;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.grant_store_credits(text, uuid, text, integer, text, text, numeric, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_store_credits(text, uuid, text, integer, text, text, numeric, text, jsonb) TO service_role;