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
  try {
    res = await SocialLogin.login(
      provider === "google"
        // Android eklentisi email/profile/openid kapsamlarını zaten varsayılan
        // olarak ekliyor. `scopes` göndermek özel kapsam akışını tetikleyip
        // değiştirilmiş bir MainActivity talep ediyor.
        ? { provider: "google", options: {} }
        : { provider: "apple", options: { scopes: ["email", "name"] } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Hesap seçici hatası: ${msg}`);
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

/** Geriye dönük uyumluluk: artık deep-link dinleyicisine gerek yok. */
export const setupNativeAuthListener = () => {};
