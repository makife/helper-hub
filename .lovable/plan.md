# Portekizce Dil Desteği

## Amaç
Bi' El At uygulamasına Türkçe, İngilizce ve Arapçanın yanında tam Portekizce desteği eklemek.

## Yapılacaklar
- Portekizceyi uygulamanın desteklenen dilleri arasına eklemek; cihaz dili Portekizceyse ilk açılışta otomatik seçmek ve tercihi profilde saklamak.
- Karşılama, profil oluşturma ve profil ekranlarındaki dil menülerine Portekiz bayrağıyla `Português` seçeneğini eklemek.
- Uygulamadaki mevcut arayüz, katalog, bildirim, ek metin ve yasal metinlerin tamamı için Portekizce sözlük oluşturmak; değişken alanlarını korumak.
- Tarih, saat, göreli zaman ve sayı gösterimini `pt-PT` biçimine uyarlamak; Portekizceyi soldan sağa göstermeye devam etmek.
- Dil değiştirme onayındaki dil adlarını dört dili doğru kapsayacak biçimde güncellemek.
- Çeviri anahtarlarının eksiksizliğini, değişkenlerin korunmasını ve uygulamanın hatasız açıldığını doğrulamak.

## Teknik Notlar
- Mevcut `t(Türkçe kaynak metin)` düzeni korunacak; Portekizce modüller mevcut İngilizce/Arapça modül ayrımıyla aynı yapıda olacak.
- Veri yapısı değişmeyecek; profilin mevcut `language` alanında `pt` değeri kullanılacak.
- Portekizce varyantı olarak Avrupa Portekizcesi (`pt-PT`) esas alınacak.
