/**
 * Firebase Phone Authentication ile telefon doğrulama.
 *
 * Native (APK / iOS): @capacitor-firebase/authentication — SMS'i Firebase gönderir,
 * Android'de otomatik SMS okuma da çalışır.
 * Web: firebase JS SDK + görünmez reCAPTCHA.
 *
 * Doğrulama bittiğinde Firebase ID token'ı alınır ve `confirm-phone-firebase`
 * edge fonksiyonuna gönderilir; numara orada profile yazılır.
 * Firebase oturumu uygulamada kullanılmaz, hemen kapatılır.
 */
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  type Auth,
} from "firebase/auth";
import { FIREBASE_WEB_CONFIG, isFirebaseWebConfigured } from "@/config/firebase";
import { supabase } from "@/integrations/supabase/client";

const isNative = () => Capacitor.isNativePlatform();

export type PhoneAuthError =
  | "not_configured"
  | "invalid_phone"
  | "send_failed"
  | "invalid_code"
  | "phone_taken"
  | "too_many_requests"
  | "save_failed"
  | "unknown";

const webAuth = (): Auth => {
  const app = getApps().length ? getApp() : initializeApp(FIREBASE_WEB_CONFIG);
  return getAuth(app);
};

let webConfirmation: ConfirmationResult | null = null;
let webVerifier: RecaptchaVerifier | null = null;
let nativeVerificationId: string | null = null;

const RECAPTCHA_ID = "firebase-recaptcha-container";

const ensureRecaptcha = (auth: Auth) => {
  if (webVerifier) return webVerifier;
  let host = document.getElementById(RECAPTCHA_ID);
  if (!host) {
    host = document.createElement("div");
    host.id = RECAPTCHA_ID;
    host.style.position = "fixed";
    host.style.bottom = "0";
    host.style.left = "0";
    host.style.zIndex = "-1";
    document.body.appendChild(host);
  }
  webVerifier = new RecaptchaVerifier(auth, RECAPTCHA_ID, { size: "invisible" });
  return webVerifier;
};

const mapFirebaseError = (err: unknown): PhoneAuthError => {
  const code = (err as { code?: string })?.code ?? "";
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (code.includes("invalid-phone") || msg.includes("invalid-phone")) return "invalid_phone";
  if (code.includes("invalid-verification-code") || msg.includes("invalid verification code"))
    return "invalid_code";
  if (code.includes("too-many-requests") || msg.includes("too-many-requests"))
    return "too_many_requests";
  return "send_failed";
};

/** SMS kodunu gönderir. `phone` E.164 biçiminde olmalı: +905xxxxxxxxx */
export const sendPhoneCode = async (
  phone: string,
): Promise<{ ok: boolean; reason?: PhoneAuthError; message?: string }> => {
  if (!/^\+\d{10,15}$/.test(phone)) return { ok: false, reason: "invalid_phone" };

  try {
    if (isNative()) {
      nativeVerificationId = null;
      let failMsg: string | null = null;
      const h1 = await FirebaseAuthentication.addListener("phoneCodeSent", (event) => {
        nativeVerificationId = event.verificationId;
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const h2 = await (FirebaseAuthentication as any).addListener(
        "phoneVerificationFailed",
        (event: { message?: string }) => {
          failMsg = event?.message || "phoneVerificationFailed";
        },
      );
      try {
        await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: phone });
        for (let i = 0; i < 60 && !nativeVerificationId && !failMsg; i++) {
          await new Promise((r) => setTimeout(r, 500));
        }
      } finally {
        await h1.remove();
        await h2?.remove?.();
      }
      if (failMsg) {
        console.error("phoneVerificationFailed:", failMsg);
        return { ok: false, reason: mapFirebaseError({ message: failMsg }), message: failMsg };
      }
      if (!nativeVerificationId) return { ok: false, reason: "send_failed", message: "timeout: kod gönderim olayı gelmedi" };
      return { ok: true };
    }

    if (!isFirebaseWebConfigured()) return { ok: false, reason: "not_configured" };
    const auth = webAuth();
    webConfirmation = await signInWithPhoneNumber(auth, phone, ensureRecaptcha(auth));
    return { ok: true };
  } catch (err) {
    console.error("sendPhoneCode:", err);
    try {
      webVerifier?.clear();
    } catch { /* yoksay */ }
    webVerifier = null;
    const e = err as { code?: string; message?: string };
    const message = [e?.code, e?.message ?? String(err)].filter(Boolean).join(": ");
    return { ok: false, reason: mapFirebaseError(err), message };
  }
};

/** 6 haneli kodu doğrular ve numarayı profile kaydeder. */
export const confirmPhoneCode = async (
  code: string,
): Promise<{ ok: boolean; phone?: string; reason?: PhoneAuthError }> => {
  if (!/^\d{6}$/.test(code)) return { ok: false, reason: "invalid_code" };

  let idToken: string | null = null;

  try {
    if (isNative()) {
      if (!nativeVerificationId) return { ok: false, reason: "send_failed" };
      await FirebaseAuthentication.confirmVerificationCode({
        verificationId: nativeVerificationId,
        verificationCode: code,
      });
      const res = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
      idToken = res.token;
    } else {
      if (!webConfirmation) return { ok: false, reason: "send_failed" };
      const cred = await webConfirmation.confirm(code);
      idToken = await cred.user.getIdToken(true);
    }
  } catch (err) {
    console.error("confirmPhoneCode:", err);
    return { ok: false, reason: mapFirebaseError(err) };
  }

  if (!idToken) return { ok: false, reason: "unknown" };

  const { data, error } = await supabase.functions.invoke("confirm-phone-firebase", {
    body: { idToken },
  });
  await signOutFirebase();

  const res = data as { ok?: boolean; phone?: string; reason?: PhoneAuthError } | null;
  if (error || !res?.ok || !res.phone) {
    return { ok: false, reason: res?.reason ?? "save_failed" };
  }
  return { ok: true, phone: res.phone };
};

/** Firebase oturumunu kapatır (uygulama oturumu Supabase'de tutulur). */
export const signOutFirebase = async () => {
  try {
    if (isNative()) await FirebaseAuthentication.signOut();
    else if (isFirebaseWebConfigured()) await webAuth().signOut();
  } catch { /* yoksay */ }
  webConfirmation = null;
  nativeVerificationId = null;
  try {
    webVerifier?.clear();
  } catch { /* yoksay */ }
  webVerifier = null;
};

/** Kod tekrar gönderilebilir mi (akış sıfırlama). */
export const resetPhoneFlow = () => {
  webConfirmation = null;
  nativeVerificationId = null;
};

