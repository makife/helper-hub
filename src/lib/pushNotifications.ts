import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import type { PluginListenerHandle } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

const isNative = () => Capacitor.isNativePlatform();
const LAST_TOKEN_KEY = "bielat_push_token";

let listenersReady = false;
let listenerHandles: PluginListenerHandle[] = [];
let currentUserId: string | null = null;
let initialization: Promise<void> | null = null;

async function saveToken(token: string) {
  if (!currentUserId || !token) return;
  localStorage.setItem(LAST_TOKEN_KEY, token);
  const { error } = await supabase.from("device_tokens").upsert(
    {
      user_id: currentUserId,
      token,
      platform: Capacitor.getPlatform(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) console.error("Device token could not be saved:", error.message);
}

function navigateFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return;
  const data = payload as Record<string, unknown>;
  const taskId = data.task_id ?? data.taskId;
  const path = typeof data.path === "string"
    ? data.path
    : typeof taskId === "string" && taskId
      ? `/task/${taskId}`
      : data.type === "message"
        ? "/messages"
        : "/notifications";

  if (!path.startsWith("/")) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

async function registerListeners() {
  if (listenersReady) return;
  listenersReady = true;

  listenerHandles = await Promise.all([
    FirebaseMessaging.addListener("tokenReceived", ({ token }) => void saveToken(token)),
    FirebaseMessaging.addListener("notificationReceived", (notification) => {
      window.dispatchEvent(new CustomEvent("native-push-received", { detail: notification }));
    }),
    FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
      navigateFromPayload(notification.data);
    }),
  ]);
}

async function initialize(userId: string) {
  if (!isNative()) return;
  currentUserId = userId;

  const permission = await FirebaseMessaging.checkPermissions();
  const result = permission.receive === "prompt"
    ? await FirebaseMessaging.requestPermissions()
    : permission;
  if (result.receive !== "granted") return;

  if (Capacitor.getPlatform() === "android") {
    try {
      await FirebaseMessaging.createChannel({
        id: "bielat_alerts_v2",
        name: "Bi' El At Bildirimleri",
        description: "Yeni mesaj ve yardım çağrısı bildirimleri",
        importance: 5,
        visibility: 1,
        sound: "default",
        vibration: true,
        lights: true,
      });
    } catch (error) {
      console.warn("Notification channel could not be created", error);
    }
  }

  await registerListeners();

  const { token } = await FirebaseMessaging.getToken();
  if (token) await saveToken(token);
}

export async function initializePushNotifications(userId: string) {
  currentUserId = userId;
  if (!isNative()) return;
  if (!initialization) {
    initialization = initialize(userId).catch((error) => {
      console.error("Push notifications could not be initialized:", error);
    });
  }
  await initialization;
}

export async function unregisterPushNotifications() {
  currentUserId = null;
  if (!isNative()) return;

  const token = localStorage.getItem(LAST_TOKEN_KEY);
  if (token) {
    await supabase.from("device_tokens").delete().eq("token", token);
    localStorage.removeItem(LAST_TOKEN_KEY);
  }

  try {
    await FirebaseMessaging.deleteToken();
  } catch {
    // Token zaten yoksa çıkış işlemi yine tamamlanmalı.
  }
}
