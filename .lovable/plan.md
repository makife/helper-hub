# Bi' El At: Lovable Cloud'dan Kendi Supabase Projesine Geçiş Planı

## Hedef
Mevcut Lovable Cloud backend'i (idroneyojlzeoebuzwsd) terk edip, kullanıcının kendi doğrudan Supabase projesine geçiş yapmak. Mevcut veriler (kullanıcılar, profiller, çağrılar, mesajlar, bildirimler, kredi işlemleri, yorumlar) ve uygulama kodu korunacak.

## Önkoşullar
- Hazır bir Supabase projesi (free/pro fark etmiyor).
- Supabase Dashboard erişimi.
- Lovable projesinde Connectors > Supabase bağlantı izni.

## Riskler ve Önlemler
- **Veri kaybı riski:** Geçiş öncesi mevcut tüm tablolar CSV/SQL dump ile yedeklenecek.
- **Kesinti riski:** Kullanıcılar geçiş sırasında giriş yapamayabilir. Plan, hızlı kesinti penceresiyle tamamlanacak.
- **Auth UID uyumsuzluğu:** Yeni Supabase projesinde aynı kullanıcıların aynı UUID'lerle oluşması gerekir. Bu, dump/restore ile sağlanacak; yeni kayıtlar sonradan elle eşleştirilmeyecek.

## Adımlar

### Adım 1: Yeni Supabase Proje Bilgilerini Toplama
Gerekli değerler:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL` (connection string / pooler)
- `SUPABASE_JWKS`

Bu bilgiler Supabase Dashboard > Project Settings > API ve Database bölümlerinden alınacak. Lovable tarafında Secrets olarak kaydedilecek.

### Adım 2: Mevcut Lovable Cloud Veritabanı Yedeği
- Tüm `public` şema nesneleri (tablolar, enumlar, fonksiyonlar, triggerlar, politikalar) SQL olarak dışa aktarılacak.
- Veri tabloları (`profiles`, `tasks`, `task_assignments`, `messages`, `notifications`, `reviews`, `credit_transactions`, `store_purchases`, `task_views`, `credentials`, `otp_codes`) CSV veya INSERT dump olarak yedeklenecek.
- Storage bucket'larındaki dosyalar (avatarlar ve görev fotoğrafları) liste halinde alınıp daha sonra yeniden yüklenecek.

### Adım 3: Yeni Supabase Projesinde Şema Kurulumu
- Yedekten alınan SQL, yeni projede çalıştırılacak.
- `auth.users` ve `public.profiles` arasındaki ilişki korunacak.
- `handle_new_user()` trigger'ı yeni `auth.users` tablosuna bağlanacak.
- `pg_cron` uzantısı ve `process_task_lifecycle()` fonksiyonu yeni projede aktif hale getirilecek.

### Adım 4: Verilerin Aktarımı
- Yedeklenen tablolara INSERT'ler yeni veritabanına yüklenecek.
- `auth.users` tablosu da aktarılacak (şifre hash'leri ve metadata ile), böylece mevcut kullanıcılar şifrelerini değiştirmeden giriş yapabilecek.
- Aktarım sonrası foreign key bütünlüğü ve sayaçlar kontrol edilecek.

### Adım 5: Storage ve Medya Aktarımı
- `avatars` ve `task-photos` bucket'ları yeni projede oluşturulacak.
- Mevcut dosyalar indirilip yeni projeye yüklenerek URL'leri güncellenecek.

### Adım 6: Edge Function'ların Yeni Projeye Deploy Edilmesi
- `send-otp`, `verify-otp`, `revenuecat-webhook` edge function'ları yeni Supabase projesine deploy edilecek.
- Gerekli secrets (Twilio, RevenueCat webhook secret) yeni projeye kaydedilecek.
- RevenueCat dashboard'daki webhook URL'si yeni adresle güncellenecek.

### Adım 7: Auth ve Social Login Yapılandırması
- Yeni Supabase projesinde Google ve Apple OAuth provider'ları aktif edilecek.
- iOS/Android redirect URI'ları yeni projeye göre güncellenecek.
- Telefon OTP tamamen kaldırıldığı için bu adım sadece social provider'ları içerir.

### Adım 8: Lovable Projesinin Yeni Backend'e Bağlanması
- `.env` ve `src/integrations/supabase/client.ts` yeni Supabase URL/anon key ile güncellenecek.
- Lovable Connectors > Supabase üzerinden yeni proje bağlanacak.
- `supabase/config.toml` gerekirse yeni proje referanslarıyla güncellenecek.

### Adım 9: Test ve Doğrulama
- Giriş akışı (Google/Apple) test edilecek.
- Çağrı oluşturma, kabul etme, mesajlaşma, kredi işlemleri ve lifecycle fonksiyonları test edilecek.
- Eski Lovable Cloud projesi devre dışı bırakılmadan önce son kullanıcı verisi senkronizasyonu tekrarlanacak.

## Teknik Detaylar

### Veritabanı Nesneleri (Aktarılacak)
- Enumlar: `app_role`, `task_category`, `task_status`, `task_urgency`, `user_role`
- Tablolar: `profiles`, `tasks`, `task_assignments`, `messages`, `notifications`, `reviews`, `credit_transactions`, `store_purchases`, `task_views`, `credentials`, `otp_codes`, `user_roles`
- Fonksiyonlar: `bump_completed_counts`, `charge_credit_on_assignment`, `charge_credit_on_task_create`, `enforce_single_active_assignment`, `grant_store_credits`, `handle_new_user`, `has_role`, `mark_arrival`, `notify_assignment_event`, `notify_task_completed`, `process_task_lifecycle`, `recalc_profile_rating`, `reject_task_completion`, `request_task_completion`, `resolve_dispute`, `set_task_expiry`, `sync_task_fill_status`, `update_updated_at_column`
- Triggerlar: Yukarıdaki fonksiyonlara bağlı tüm triggerlar
- Storage bucket'ları: `avatars` (public), `task-photos` (public)

### Dikkat Edilecek Kısıtlar
- `auth.users` tablosuna doğrudan INSERT yapmak Supabase'de service role ile mümkündür; dump restore sırasında UUID'ler ve şifre hash'leri korunmalı.
- `storage.objects` RLS politikaları yeni projede yeniden oluşturulmalı.
- `pg_cron` extension'ı yeni projede aktif edilmeli ve `process_task_lifecycle()` cron job olarak tanımlanmalı.

### Tahmini Süre
- Hazırlık ve yedekleme: 15-30 dk
- Yeni proje şema ve veri aktarımı: 30-60 dk
- Edge function, auth, storage ve frontend bağlantısı: 30-45 dk
- Test ve doğrulama: 15-30 dk
- Toplam: 1.5 - 2.5 saat

## Sonraki Adım
Plan onaylandıktan sonra önce yeni Supabase proje bilgilerini (URL, anon key, service role key, DB connection string) alarak Adım 1'e başlanacak.
