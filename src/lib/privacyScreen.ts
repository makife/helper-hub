import { Capacitor } from "@capacitor/core";
import { PrivacyScreen } from "@capacitor-community/privacy-screen";

/**
 * Native'de ekran görüntüsü/kayıt koruması.
 * Android: FLAG_SECURE ile ekran görüntüsü ve ekran kaydı tamamen engellenir.
 * iOS: Uygulama değiştiricide içerik gizlenir; ekran kaydında görüntü karartılır.
 * Web'de hiçbir şey yapmaz.
 */
export const enablePrivacyScreen = () => {
  // iOS'ta ekran görüntüsü engeli güvenilir değil ve arayüzü yavaşlatıyordu;
  // yalnızca Android'de (FLAG_SECURE) açık.
  if (Capacitor.getPlatform() !== "android") return;
  PrivacyScreen.enable().catch((err) => {
    console.warn("Gizlilik ekranı etkinleştirilemedi:", err);
  });
  installFilePickerGuard();
};

let pickerGuardInstalled = false;
/**
 * iOS'ta dosya/kamera seçici açılınca uygulama pasifleşiyor ve gizlilik ekranı
 * seçicinin üstüne açılıp kapanırken seçiciyi de kapatarak çökmeye yol açıyor.
 * Dosya girişine dokunulduğunda korumayı durdurup, seçim bitince geri açıyoruz.
 */
const installFilePickerGuard = () => {
  if (pickerGuardInstalled || Capacitor.getPlatform() !== "ios") return;
  pickerGuardInstalled = true;
  let paused = false;
  const resume = () => {
    if (!paused) return;
    paused = false;
    setTimeout(() => enablePrivacyScreen(), 800);
  };
  document.addEventListener(
    "click",
    (e) => {
      const el = e.target as HTMLElement | null;
      if (el instanceof HTMLInputElement && el.type === "file") {
        paused = true;
        void PrivacyScreen.disable().catch(() => {});
      }
    },
    true,
  );
  document.addEventListener("change", (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type === "file") resume();
  }, true);
  document.addEventListener("cancel", (e) => {
    if (e.target instanceof HTMLInputElement && e.target.type === "file") resume();
  }, true);
  window.addEventListener("focus", () => setTimeout(resume, 1500));
};

/**
 * Sistem penceresi açan işlemler (Google/Apple giriş, SMS doğrulama) sırasında
 * gizlilik ekranını geçici olarak kapatır. iOS'ta eklenti uygulama pasifleşince
 * en üstteki pencerenin üzerine gri bir kaplama açıyor ve geri dönüşte onu
 * kapatırken Google hesap seçicisini de kapatıp çökmeye yol açıyordu.
 */
export const withPrivacyScreenPaused = async <T,>(fn: () => Promise<T>): Promise<T> => {
  if (Capacitor.getPlatform() !== "android") return fn();
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
