import { Capacitor } from "@capacitor/core";
import { PrivacyScreen } from "@capacitor-community/privacy-screen";

/**
 * Native'de ekran görüntüsü/kayıt koruması.
 * Android: FLAG_SECURE ile ekran görüntüsü ve ekran kaydı tamamen engellenir.
 * iOS: Uygulama değiştiricide içerik gizlenir; ekran kaydında görüntü karartılır.
 * Web'de hiçbir şey yapmaz.
 */
export const enablePrivacyScreen = () => {
  if (!Capacitor.isNativePlatform()) return;
  PrivacyScreen.enable().catch((err) => {
    console.warn("Gizlilik ekranı etkinleştirilemedi:", err);
  });
};
