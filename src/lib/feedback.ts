import { Capacitor } from "@capacitor/core";
import { Badge } from "@capawesome/capacitor-badge";

/** Bildirim geldiğinde kısa bir "ding" sesi çalar (web + native webview). */
export function playNotificationSound() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;

    const ping = (freq: number, start: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.35, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + 0.4);
    };

    ping(880, 0);
    ping(1320, 0.14);
    window.setTimeout(() => void ctx.close(), 900);
  } catch {
    // Ses çalınamazsa bildirim yine de gösterilir.
  }
}

/** Kısa titreşim (destekleyen cihazlarda). */
export function vibrateOnce() {
  try {
    navigator.vibrate?.([40, 60, 40]);
  } catch {
    // yoksay
  }
}

/** Bildirim geldiğinde ses + titreşim. */
export function notifyFeedback() {
  playNotificationSound();
  vibrateOnce();
}

/** Uygulama ikonundaki okunmamış rozetini günceller (native). */
export async function setAppBadge(count: number) {
  const safe = Math.max(0, Math.floor(count));
  try {
    if (Capacitor.isNativePlatform()) {
      const { display } = await Badge.checkPermissions();
      if (display !== "granted") {
        const req = await Badge.requestPermissions();
        if (req.display !== "granted") return;
      }
      if (safe > 0) await Badge.set({ count: safe });
      else await Badge.clear();
      return;
    }
    const nav = navigator as Navigator & {
      setAppBadge?: (n?: number) => Promise<void>;
      clearAppBadge?: () => Promise<void>;
    };
    if (safe > 0) await nav.setAppBadge?.(safe);
    else await nav.clearAppBadge?.();
  } catch {
    // Rozet desteklenmiyorsa sessizce geç.
  }
}
