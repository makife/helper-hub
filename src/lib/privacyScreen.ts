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

/**
 * Sistem penceresi açan işlemler (Google/Apple giriş, SMS doğrulama) sırasında
 * gizlilik ekranını geçici olarak kapatır. iOS'ta eklenti uygulama pasifleşince
 * en üstteki pencerenin üzerine gri bir kaplama açıyor ve geri dönüşte onu
 * kapatırken Google hesap seçicisini de kapatıp çökmeye yol açıyordu.
 */
export const withPrivacyScreenPaused = async <T,>(fn: () => Promise<T>): Promise<T> => {
  if (!Capacitor.isNativePlatform()) return fn();
  try {
    await PrivacyScreen.disable();
  } catch (err) {
    console.warn("Gizlilik ekranı durdurulamadı:", err);
  }
  try {
    return await fn();
  } finally {
    // Sistem penceresi tamamen kapanıp uygulama aktif olduktan sonra geri aç.
    setTimeout(() => enablePrivacyScreen(), 800);
  }
};
