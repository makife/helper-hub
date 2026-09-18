import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { ensureLocationPermission } from "@/lib/geo";
import { ensureNotificationPermission } from "@/lib/pushNotifications";

/**
 * Uygulama ilk açıldığında sistem izin pencerelerini SIRAYLA gösterir.
 * Android/iOS aynı anda iki izin diyalogu isteyince ikincisi sessizce
 * düşüyor; bu yüzden önce bildirim, sonra konum isteniyor.
 *
 * Ayrıca WebView modül yüklenirken Activity henüz hazır olmadığından
 * izinler hiç görünmeyebiliyor: uygulama öne gelene kadar bekliyoruz.
 */

let started = false;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitUntilActive = async () => {
  try {
    const { isActive } = await CapApp.getState();
    if (isActive) return;
  } catch {
    return;
  }
  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    void CapApp.addListener("appStateChange", ({ isActive }) => {
      if (isActive) finish();
    });
    setTimeout(finish, 4000);
  });
};

export const requestStartupPermissions = async () => {
  if (started) return;
  started = true;
  if (!Capacitor.isNativePlatform()) return;

  await waitUntilActive();
  // Açılış ekranı kapanıp arayüz oturana kadar kısa bekleme.
  await wait(1200);

  try {
    await ensureNotificationPermission();
  } catch (error) {
    console.warn("Bildirim izni istenemedi:", error);
  }

  // İki diyalog arasında nefes payı bırak: aksi halde ikincisi görünmüyor.
  await wait(600);

  try {
    await ensureLocationPermission();
  } catch (error) {
    console.warn("Konum izni istenemedi:", error);
  }
};
