import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { App } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

// OAuth broker sadece yayınlanan site üzerinden çalışıyor (native APK'da
// window.location.origin "https://localhost" olduğu için 404 veriyordu).
const PUBLISHED_ORIGIN = "https://task-hand-shake.lovable.app";
const NATIVE_SCHEME = "com.ergan.bielat";
const NATIVE_CALLBACK = `${NATIVE_SCHEME}://auth/callback`;
const WEB_CALLBACK = `${PUBLISHED_ORIGIN}/auth/callback`;
const STATE_KEY = "native_oauth_state";

export const isNativePlatform = () => Capacitor.isNativePlatform();

const generateState = () => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Native (Android/iOS) Google/Apple girişi:
 * 1) Sistem tarayıcısında yayınlanan sitenin OAuth broker'ını açar
 * 2) Giriş bitince site, com.ergan.bielat://auth/callback#access_token=... adresine yönlendirir
 * 3) appUrlOpen dinleyicisi token'ları alıp oturumu kurar
 */
export const signInNativeOAuth = async (provider: "google" | "apple") => {
  const state = generateState();
  try {
    sessionStorage.setItem(STATE_KEY, state);
  } catch {
    // sessionStorage erişilemezse state doğrulaması atlanır
  }
  const params = new URLSearchParams({
    provider,
    redirect_uri: WEB_CALLBACK,
    state,
  });
  await Browser.open({ url: `${PUBLISHED_ORIGIN}/~oauth/initiate?${params.toString()}` });
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
    const isNativeCallback = url.startsWith(NATIVE_CALLBACK);
    const isWebCallback = url.startsWith(WEB_CALLBACK);
    if (!isNativeCallback && !isWebCallback) return;
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
    const expectedState = (() => {
      try {
        return sessionStorage.getItem(STATE_KEY);
      } catch {
        return null;
      }
    })();
    const returnedState = params.get("state");
    if (expectedState && returnedState && expectedState !== returnedState) {
      console.error("OAuth state mismatch");
      return;
    }
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) {
      console.error("OAuth callback missing tokens");
      return;
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      console.error("Session error:", sessionError);
      return;
    }
    try {
      sessionStorage.removeItem(STATE_KEY);
    } catch {
      // yoksay
    }
  });
};
