-- Darlayıcı eski kısıtlamayı kaldırıyoruz
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_price_check;

-- Esnek yeni kısıtlamayı ekliyoruz (10 TL ile 100.000 TL arası)
ALTER TABLE public.tasks ADD CONSTRAINT tasks_price_check CHECK (price >= 10 AND price <= 100000);
