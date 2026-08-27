ALTER TABLE public.tasks DROP CONSTRAINT tasks_price_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_price_check CHECK (price >= 50 AND price <= 100000);