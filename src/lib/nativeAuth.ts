import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

const NATIVE_SCHEME = "com.ergan.bielat";
const NATIVE_CALLBACK = `${NATIVE_SCHEME}://auth/callback`;

export const isNativePlatform = () => Capacitor.isNativePlatform();

/**
 * Native (Android/iOS) Google/Apple girişi (doğrudan Supabase Auth):
 * 1) supabase.auth.signInWithOAuth ile yetkilendirme URL'si alınır (PKCE)
 * 2) URL sistem tarayıcısında açılır
 * 3) Giriş bitince Supabase, com.ergan.bielat://auth/callback?code=... adresine yönlendirir
 * 4) appUrlOpen dinleyicisi code'u alıp oturuma çevirir
 */
export const signInNativeOAuth = async (provider: "google" | "apple") => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: NATIVE_CALLBACK,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data?.url) {
    throw error ?? new Error("OAuth URL alınamadı");
  }
  await Browser.open({ url: data.url });
};

const parseParams = (url: string) => {
  const params = new URLSearchParams();
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  if (queryIndex !== -1) {
    const end = hashIndex !== -1 ? hashIndex : url.length;
    new URLSearchParams(url.slice(queryIndex + 1, end)).forEach((v, k) => params.set(k, v));
  }
  if (hashIndex !== -1) {
    new URLSearchParams(url.slice(hashIndex + 1)).forEach((v, k) => params.set(k, v));
  }
  return params;
};

/** Uygulama açılışında bir kez çağrılır; OAuth deep-link geri dönüşünü yakalar. */
export const setupNativeAuthListener = () => {
  if (!isNativePlatform()) return;
  App.addListener("appUrlOpen", async ({ url }) => {
    if (!url.startsWith(NATIVE_CALLBACK)) return;
    try {
      await Browser.close();
    } catch {
      // tarayıcı zaten kapalı olabilir
    }
    const params = parseParams(url);
    const error = params.get("error");
    if (error) {
      console.error("OAuth error:", params.get("error_description") ?? error);
      return;
    }

    // PKCE akışı: code'u oturuma çevir
    const code = params.get("code");
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("Code exchange error:", exchangeError);
      }
      return;
    }

    // Implicit akış yedeği: token'lar hash'te gelebilir
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken && refreshToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) {
        console.error("Session error:", sessionError);
      }
      return;
    }

    console.error("OAuth callback missing code/tokens");
  });
};
