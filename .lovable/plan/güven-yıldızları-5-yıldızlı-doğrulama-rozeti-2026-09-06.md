# Güven Yıldızları (5 Yıldızlı Doğrulama Rozeti)

Devletin ücretsiz TC sorgusu bulut sunuculara kapalı olduğu için otomatik kimlik doğrulama yerine
**belge yükle → admin onaylasın** modeline geçiyoruz. Her onaylanan doğrulama 1 yıldız veriyor.

## 5 yıldız nasıl kazanılıyor

| Yıldız | Doğrulama | Onay şekli |
|---|---|---|
| 1 | Telefon (SMS kodu) | Otomatik — giriş yaparken zaten doğrulanıyor |
| 2 | Kimlik belgesi (ön yüz fotoğrafı) | Admin onayı |
| 3 | Selfie (kimlikle birlikte) | Admin onayı |
| 4 | Adli sicil (sabıka) kaydı belgesi | Admin onayı |
| 5 | Meslek/yetkinlik belgesi (mevcut "Yetkinlik Belgelerim") | Admin onayı |

Profilde ve iş kartlarında yıldız sayısı görünür: "⭐⭐⭐☆☆ Güven 3/5".

## Kullanıcı tarafı

- Profil sayfasındaki mevcut "Kimlik Doğrulama" kartı **"Güven Doğrulaması"** kartına dönüşür:
  5 satır, her satırda durum (eksik / incelemede / onaylandı / reddedildi + red sebebi) ve
  belge yükleme butonu.
- Belgeler **gizli (private)** bir depolama alanına yüklenir; sadece sahibi ve adminler görebilir.
- Profil oluşturma ekranının sonunda "Güvenini artır" yönlendirmesi eklenir (zorunlu değil,
  atlanabilir), böylece kayıt akışı uzamaz.
- Reddedilen belge yeniden yüklenebilir; her tür için en fazla 5 deneme.

## Admin tarafı

- Mevcut `/admin/reports` yanına `/admin/verifications` sayfası: bekleyen başvurular listesi,
  belge önizleme, **Onayla / Reddet (sebep yaz)** butonları.
- Yeni başvuru geldiğinde adminlere bildirim düşer.

## KVKK

- Adli sicil ve kimlik belgeleri onaydan sonra **otomatik silinir**; geride sadece
  "onaylandı + tarih" bilgisi kalır. Kartta bu açıkça yazar.
- Kimlik numarası hiçbir yerde saklanmaz. Reddedilen belgeler 30 gün sonra silinir.

## Teknik notlar

- Yeni tablo `verification_requests`: `user_id`, `kind` (phone/id_card/selfie/criminal_record/skill),
  `status` (pending/approved/rejected), `file_path`, `reviewer_id`, `review_note`, tarihler.
  RLS: kullanıcı kendi kaydını görür/oluşturur, admin (`has_role`) hepsini görür ve günceller.
- `trust_score(user_id)` security-definer fonksiyonu onaylanan tür sayısını (0-5) döndürür;
  profil ve iş kartları bunu okur.
- Private storage bucket `verification-docs`, yol `{user_id}/{kind}-{timestamp}`; imzalı URL ile
  görüntüleme. Onay/red sonrası dosya silinir.
- Silme işini `pg_cron` + edge function ile günlük temizlik yapar.
- `IdentityVerifyCard.tsx` yerine `TrustVerificationCard.tsx`; `ProfileBadges.tsx`'e yıldız satırı;
  eski NVİ edge fonksiyonu kaldırılır.

## OTP

Telefon doğrulaması zaten Twilio ile çalışıyor ama yalnızca doğrulanmış +90 numaralara SMS gidiyor
(Twilio deneme hesabı kısıtı). 1. yıldızın herkeste çalışması için Twilio hesabının
yükseltilmesi gerekiyor — bu senin tarafında yapılacak bir adım, kod değişikliği gerektirmiyor.
