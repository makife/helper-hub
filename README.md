# Helper Hub

kanka yeni bir mobil uygulama yapacağız seninle. Şimdi sana mvp featureları veriyorum.

1. 👤 AUTH & ONBOARDING (Çok kritik – boş haritayı önler)

Zorunlu:

Telefon numarası ile kayıt + OTP doğrulaması (her iki rol için)

Rol seçimi ilk girişte: İş Sahibi veya Tasker (sonradan değiştirebilsin ama sınırlı)

Ad soyad + zorunlu profil fotoğrafı + kısa bio (max 150 karakter)

Konum izni alma (ilk açılışta agresif ama kullanıcı dostu açıklama ile)

Tasker için ekstra: Yaş aralığı, basit beceri seçimi (“Ampul takma, mobilya monte, küçük tamir” gibi 5-6 ön tanımlı)

Güçlü Önerilen:

İlk girişte “Hoş geldin” onboarding carousel: App ne işe yarar + “Bugün 3 iş var” gibi demo veri gösterimi (gerçek veri yoksa)

Referral / davet kodu (ilk 50 kullanıcıya bonus kredi)

2. 📍 CANLI HARİTA & KEŞİF (En kritik kısım – boş görünmemeli)

Zorunlu:

Ana ekran: Canlı harita (Google Maps / Mapbox)

İş Sahibi görünümü: Yakındaki açık işler pin olarak (fiyat, tahmini süre, kategori ikonu)

Tasker görünümü: Yakındaki açık işler + “Benim için uygun işler” filtresi (mesafe + fiyat + acillik)

Pin tıklayınca: Detay kartı (açıklama, fiyat, süre, iş sahibi puanı, “KABUL ET” butonu)

Harita boş görünmemesi için:

Tek mahalle kapalı beta modunda “demo işler” göster (admin tarafından yönetilir, gerçek değil)

Veya “Şu an X iş var, yakında yenileri gelecek” placeholder + push teşviki

Güçlü Önerilen:

Filtre: Mesafe (1-5-10 km), fiyat aralığı, “Acil” etiketi

Tasker için “Availability” toggle (Şu an müsaitim / 1 saat sonra müsaitim)

3. ➕ İŞ AÇMA (İş Sahibi tarafı)

Zorunlu:

Kategori: Sadece “Basit Ev İşleri” (MVP’de tek)

Alt etiketler: Ampul tak, Perde as, Küçük mobilya monte, Duvar delme/tamir, vs. (5-8 tane)

Açıklama (zorunlu, min 20 karakter) + opsiyonel 1-2 fotoğraf ekleme

Fiyat önerisi: 100-500 TL arası slider veya ön tanımlı paketler

Tahmini süre: 15 dk / 30 dk / 45 dk / 60 dk

Opsiyonlar:

🔥 Acil (fiyat düşmez, daha geniş push)

⏳ Bekleyebilirim (dinamik fiyat aktif olur)

Adres otomatik (haritadan pin) + opsiyonel not (“Kapı zilini çalma, mesaj at”)

Güçlü Önerilen:

İş açarken kredi düşümü (1 kredi = 1 iş ilanı) – spam önler

“Taslak olarak kaydet” özelliği

4. ⏳ DİNAMİK FİYAT MEKANİZMASI

Sadece “Bekleyebilirim” seçilirse aktif.

Zorunlu kurallar:

Başlangıç fiyatı iş sahibi belirler

Her 8-10 dakikada otomatik %8-10 düşüş (senin 10dk/220TL örneğine benzer)

Minimum taban fiyat: Başlangıç fiyatının %65-70’i (aşağı düşmesin)

Düşüş transparan gösterilsin: “Şu an 250 TL → 10 dk sonra 220 TL olacak”

Birisi kabul ederse anında tüm düşüş durur ve iş kilitlenir

Güçlü Önerilen:

Düşüş hızı iş sahibinin “bekleme süresi” tercihine göre hafif ayarlanabilir

5. ⚡ EŞLEŞME SİSTEMİ (En kritik)

Zorunlu:

İlk kabul eden alır mantığı (basit ve hızlı)

Kabul edince:

İş anında “Kapandı” statüsüne geçer

Diğer Tasker’lara “Bu iş alındı” bildirimi

İş Sahibi ve Tasker arasında chat otomatik açılır

Double-booking önleme: Bir Tasker aynı anda max 1 aktif işi kabul edebilsin

Güçlü Önerilen:

Kabul sonrası 5-10 dk içinde “Yola çıktım” butonu (konum paylaşımı ile)

Basit dispute butonu (“İş eşleşti ama sorun var”)

6. 🔔 PUSH & BİLDİRİM SİSTEMİ

Zorunlu:

Yeni iş açıldığında: Belirlenen km içindeki müsait Tasker’lara push (OneSignal/Firebase)

Öncelik: Yüksek fiyat + Acil → daha geniş radius

Kabul, iptal, chat mesajı, iş bitişi için her iki tarafa da push

Güçlü Önerilen:

Tasker’a “Yakınında yeni iş açıldı, 250 TL – 20 dk yürüme mesafesi” tarzı zengin bildirim

7. 💬 CHAT (Minimal ama yeterli)

Zorunlu:

İş eşleştikten sonra sadece ilgili iş için chat

Metin mesajı + konum paylaşımı + fotoğraf gönderme

“Yola çıktım”, “Geldim”, “İşi bitirdim” gibi hızlı reply butonları

Güçlü Önerilen:

WhatsApp’a kaçışı azaltmak için “Bu chati iş bittikten sonra sakla” veya favori Tasker ekle

8. ⭐ PUAN & YORUM SİSTEMİ

Zorunlu:

İş tamamlanınca karşılıklı puan verme (1-5 yıldız) + kısa yorum (opsiyonel)

Profil’de göster: Ortalama puan (desimal), toplam tamamlanan iş sayısı, son 5 yorum

Puan düşüşü otomatik: Çok iptal veya “gitmedi” durumunda

9. ❌ İPTAL & CEZA MEKANİZMASI (Sistemi kurtarır)

Zorunlu kurallar:

İş alınmadan iptal: Serbest (ama çok yapana uyarı)

İş alındıktan sonra iptal:

Tasker iptal ederse: Puan düşüşü + geçici ban (3. seferde 7 gün)

İş Sahibi iptal ederse: Kredi iadesi ama puan hafif düşsün

“Görev yerine getirilmedi” şikayeti → admin onayı ile ceza

Güçlü Önerilen:

Basit Dispute Flow: “Şikayet et” butonu → admin paneline düşsün

10. 💎 KREDİ / ELMAS SİSTEMİ

Zorunlu:

İş Sahibi: Her iş ilanı için 1 kredi harcar (başlangıçta herkese 5 ücretsiz kredi)

Tasker tarafı: Ücretsiz (ama premium hızlı görünürlük ileride gelebilir)

Güçlü Önerilen:

İlk 3 işi tamamlayana bonus kredi (Tasker’ı motive etmek için)

11. 🧠 GÜVEN KATMANLARI (MVP için)

Telefon OTP + profil foto zorunlu

Puan sistemi + karşılıklı yorum

Basit “Doğrulanmış Telefon” rozeti

Admin panelinde manuel ban / uyarı

(MVP dışı: Kimlik fotoğrafı, referans, sigorta)

12. 📊 BASİT LİDERBOARD + MOTİVASYON

Güçlü Önerilen:

Haftalık “En aktif Tasker” (iş sayısı + puan)

“Bu mahallede en çok iş tamamlandı” istatistiği

Kişisel profilde “Bu ay 12 iş tamamladın, tebrikler!”

13. ⚙️ ADMIN PANEL (Asla atlama – operasyonel ölümcül hata)

Zorunlu basit admin (Supabase + basit React admin):

Tüm açık/kapalı işleri gör

Kullanıcıları ara, puan düzenle, ban at

Şikayet ve dispute’ları yönet

Demo iş ekle/çıkar (boş harita için)

Basit istatistik: Aktif kullanıcı, tamamlanan iş, iptal oranı

14. Ekstra Küçük ama Önemli Eklemeler

Favoriler: İş Sahibi en iyi Tasker’larını kaydetsin

İş geçmişi: Her iki taraf için “Benim işlerim” sayfası (aktif + tamamlanmış + iptal)

Basit ayarlar: Bildirim tercihleri, konum güncelleme

Offline uyarı: “İnternet yoksa harita güncellenemez”

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f1f9c2a-8b8f-4b3e-a935-d37f45722ead).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
