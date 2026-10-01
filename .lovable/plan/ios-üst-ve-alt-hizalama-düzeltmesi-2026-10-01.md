# iOS üst ve alt hizalama düzeltmesi

## Yapılacaklar
- iPhone ve iPad çentik, durum çubuğu ve ana ekran göstergesi boşluklarının tarayıcı tarafından doğru okunmasını sağlayacağım.
- Uygulama genelindeki tam ekran sayfaları görünen ekran yüksekliğine sabitleyerek alt taşmayı kaldıracağım.
- İlk açılış, tanıtım ve profil kurulum ekranlarında üst kontroller ile alt düğmelere güvenli boşluk ekleyeceğim.
- Sabit alt menü ve alttan açılan pencerelerin ana ekran göstergesinin üzerinde kalmasını sağlayacağım.
- Küçük iPhone ve iPad ölçülerinde görünümü, kaydırmayı ve düğme erişilebilirliğini kontrol edeceğim.

## Teknik ayrıntı
- CSS `env(safe-area-inset-*)` değerleri ve dinamik ekran yüksekliği kullanılacak.
- Mevcut görsel tasarım ve işlevler değiştirilmeyecek; yalnızca yerleşim güvenli alanlara uyarlanacak.
