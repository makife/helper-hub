import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import { translate } from "@/lib/i18n";
import { safeLocal } from "@/lib/safeStorage";
import {
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  APPLE_CLIENT_ID,
  APPLE_REDIRECT_URL,
} from "@/config/socialAuth";

const PENDING_REFERRAL_KEY = "bielat_pending_referral_code";

export const isNativePlatform = () => Capacitor.isNativePlatform();

let initialized = false;

const ensureInit = async () => {
  if (initialized) return;
  await SocialLogin.initialize({
    google: GOOGLE_WEB_CLIENT_ID
      ? {
          webClientId: GOOGLE_WEB_CLIENT_ID,
          // iOS'ta Google girişi kendi istemci kimliğini ister.
          iOSClientId: GOOGLE_IOS_CLIENT_ID || undefined,
        }
      : undefined,
    apple: {
      clientId: APPLE_CLIENT_ID || undefined,
      redirectUrl: APPLE_REDIRECT_URL || undefined,
    },
  });
  initialized = true;
};

/**
 * Native (Android/iOS) Google/Apple girişi.
 * Tarayıcı açılmaz: sistemin hesap seçici ekranı gelir, dönen ID token
 * doğrudan Supabase oturumuna çevrilir.
 */
export const signInNativeOAuth = async (provider: "google" | "apple") => {
  if (provider === "google" && !GOOGLE_WEB_CLIENT_ID) {
    throw new Error("Google Web Client ID tanımlı değil (src/config/socialAuth.ts)");
  }


  await ensureInit();

  let res: Awaited<ReturnType<typeof SocialLogin.login>>;

  try {
    res =
      provider === "google"
        ? await SocialLogin.login({
            provider: "google",
            // Yetkili hesap filtresi kapalı olmalı; aksi halde yeni kurulumlar ve
            // Family Link hesapları Credential Manager tarafından elenebilir.
            // Eklenti [16] hatasında kendi durum temizleme + tek yeniden deneme
            // akışını zaten uyguluyor, burada ikinci bir tekrar başlatmıyoruz.
            options: {
              style: "standard",
              filterByAuthorizedAccounts: false,
              autoSelectEnabled: false,
            },
          })
        : await SocialLogin.login({
            provider: "apple",
            options: { scopes: ["email", "name"] },
          });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (provider === "google" && /\[16\]|reauth|16:/i.test(msg)) {
      throw new Error(
        "Google hesabı doğrulanamadı. Lütfen başka bir Google hesabı seç veya Google hesabındaki üçüncü taraf bağlantı izinlerini kontrol et.",
      );
    }
    throw new Error(`Hesap seçici hatası: ${msg}`);
  }


  const result = res.result as unknown as Record<string, unknown> | undefined;
  const profileToken = (result?.profile as Record<string, unknown> | undefined)?.idToken as
    | string
    | undefined;
  const idToken =
    (result?.idToken as string | undefined) ??
    (result?.identityToken as string | undefined) ??
    (result?.authenticationToken as string | undefined) ??
    profileToken;

  if (!idToken) {
    console.error("Native OAuth: idToken yok", JSON.stringify(res));
    throw new Error("Kimlik doğrulama anahtarı alınamadı");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: provider === "google" ? "google" : "apple",
    token: idToken,
  });
  if (error) {
    console.error("Supabase signInWithIdToken hatası:", error.status, error.message);
    // Teşhis için gerçek sunucu mesajını gösteriyoruz (kod: durum + mesaj).
    throw new Error(
      `${translate("Giriş yapılamadı, tekrar dene.")} (sunucu ${error.status ?? "?"}: ${error.message})`,
    );
  }
};

/**
 * Native deep-link dinleyicisi.
 * com.ergan.bielat://davet?code=XXXX gibi davet linklerini yakalayıp
 * localStorage'a kaydeder. ProfileSetup ekranı bu kodu okuyup popup gösterir.
 */
export const setupNativeAuthListener = () => {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener("appUrlOpen", ({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "com.ergan.bielat:") return;

      const code = parsed.searchParams.get("code");
      if (code && parsed.hostname === "davet") {
        safeLocal.set(PENDING_REFERRAL_KEY, code.trim().toUpperCase());
      }
    } catch {
      // Geçersiz URL'leri görmezden gel
    }
  });
};

export const getPendingReferralCode = () =>
  safeLocal.get(PENDING_REFERRAL_KEY);

export const clearPendingReferralCode = () =>
  safeLocal.remove(PENDING_REFERRAL_KEY);
