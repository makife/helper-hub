ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'TRY';
ALTER TABLE public.tasks ADD CONSTRAINT tasks_currency_check CHECK (currency IN ('TRY','USD','EUR','GBP'));