/**
 * Ekran görüntüsü/kayıt engeli kaldırıldı (iOS'ta güvenilir değildi ve arayüzü
 * yavaşlatıyordu; Android'de de kullanıcı isteğiyle kapatıldı).
 * Fonksiyonlar mevcut çağrılar bozulmasın diye bırakıldı.
 */
export const enablePrivacyScreen = () => {};

export const withPrivacyScreenPaused = async <T,>(fn: () => Promise<T>): Promise<T> => fn();
