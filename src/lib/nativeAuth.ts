import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SocialLogin } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";
import {
  GOOGLE_WEB_CLIENT_ID,
  APPLE_CLIENT_ID,
  APPLE_REDIRECT_URL,
} from "@/config/socialAuth";

const PENDING_REFERRAL_KEY = "bielat_pending_referral_code";

export const isNativePlatform = () => Capacitor.isNativePlatform();

let initialized = false;

const ensureInit = async () => {
  if (initialized) return;
  await SocialLogin.initialize({
    google: GOOGLE_WEB_CLIENT_ID ? { webClientId: GOOGLE_WEB_CLIENT_ID } : undefined,
    apple: APPLE_CLIENT_ID
      ? { clientId: APPLE_CLIENT_ID, redirectUrl: APPLE_REDIRECT_URL || undefined }
      : undefined,
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
  if (provider === "apple" && !APPLE_CLIENT_ID) {
    throw new Error("Apple Client ID tanımlı değil (src/config/socialAuth.ts)");
  }

  await ensureInit();

  let res: Awaited<ReturnType<typeof SocialLogin.login>>;

  const googleLogin = (style: "standard" | "bottom") =>
    SocialLogin.login({
      provider: "google",
      // Android eklentisi email/profile/openid kapsamlarını zaten varsayılan
      // olarak ekliyor. `scopes` göndermek özel kapsam akışını tetikleyip
      // değiştirilmiş bir MainActivity talep ediyor.
      options:
        style === "bottom"
          ? { style: "bottom", filterByAuthorizedAccounts: false, autoSelectEnabled: false }
          : { style: "standard", forceRefreshToken: true },
    });

  try {
    res =
      provider === "google"
        ? await googleLogin("standard")
        : await SocialLogin.login({
            provider: "apple",
            options: { scopes: ["email", "name"] },
          });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);

    // Credential Manager bazı cihazlarda önbelleğe alınmış kimlik bilgisi
    // yüzünden [16] "Account reauth failed" veriyor. Önbelleği temizleyip
    // alternatif (bottom sheet) akışıyla bir kez daha deniyoruz.
    if (provider === "google" && /\[16\]|reauth|16:/i.test(msg)) {
      try {
        await SocialLogin.logout({ provider: "google" });
      } catch {
        // önbellek zaten boş olabilir
      }
      try {
        res = await googleLogin("bottom");
      } catch (err2) {
        const msg2 = err2 instanceof Error ? err2.message : String(err2);
        throw new Error(
          `Google hesabı doğrulanamadı. Telefon ayarlarından Google hesabını kaldırıp yeniden ekleyip dener misin? (${msg2})`,
        );
      }
    } else {
      throw new Error(`Hesap seçici hatası: ${msg}`);
    }
  }


  const result = res.result as unknown as Record<string, unknown> | undefined;
  const idToken =
    (result?.idToken as string | undefined) ??
    ((result?.authenticationToken as string | undefined) ?? undefined);

  if (!idToken) {
    throw new Error("Kimlik doğrulama anahtarı alınamadı");
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: provider === "google" ? "google" : "apple",
    token: idToken,
  });
  if (error) throw new Error(`Oturum açılamadı: ${error.message}`);
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
        localStorage.setItem(PENDING_REFERRAL_KEY, code.trim().toUpperCase());
      }
    } catch {
      // Geçersiz URL'leri görmezden gel
    }
  });
};

export const getPendingReferralCode = () =>
  localStorage.getItem(PENDING_REFERRAL_KEY);

export const clearPendingReferralCode = () =>
  localStorage.removeItem(PENDING_REFERRAL_KEY);
