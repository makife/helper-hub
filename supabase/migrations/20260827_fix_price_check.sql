-- 1. tasks tablosundaki price kısıtlamasını adı ne olursa olsun tamamen kaldır
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.tasks'::regclass AND contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE public.tasks DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 2. Yeni ve esnek kısıtlamaları sıfırdan ekle
ALTER TABLE public.tasks ADD CONSTRAINT tasks_price_check CHECK (price >= 50 AND price <= 50000);
ALTER TABLE public.tasks ADD CONSTRAINT tasks_description_check CHECK (char_length(description) >= 20);
