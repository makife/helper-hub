import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

const isNative = () => Capacitor.isNativePlatform();
const LAST_TOKEN_KEY = 'bielat_push_token';

let listenersReady = false;
let currentUserId: string | null = null;

async function saveToken(token: string) {
  if (!currentUserId) return;
  localStorage.setItem(LAST_TOKEN_KEY, token);
  const { error } = await supabase.from('device_tokens').upsert(
    { user_id: currentUserId, token, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
    { onConflict: 'token' },
  );
  if (error) console.error('Device token could not be saved:', error.message);
}

function navigateTo(path: unknown) {
  if (typeof path !== 'string' || !path.startsWith('/')) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export async function initializePushNotifications(userId: string) {
  if (!isNative()) return;
  currentUserId = userId;

  const permission = await FirebaseMessaging.checkPermissions();
  const result = permission.receive === 'prompt'
    ? await FirebaseMessaging.requestPermissions()
    : permission;
  if (result.receive !== 'granted') return;

  if (Capacitor.getPlatform() === 'android') {
    try {
      await FirebaseMessaging.createChannel({
        id: 'bielat_high',
        name: "Bi' El At Bildirimleri",
        description: 'Yeni mesaj ve yardım çağrısı bildirimleri',
        importance: 5,
        visibility: 1,
        sound: 'default',
        vibration: true,
        lights: true,
      });
    } catch (e) {
      console.warn('Notification channel could not be created', e);
    }
  }

  if (!listenersReady) {
    listenersReady = true;
    await FirebaseMessaging.addListener('tokenReceived', ({ token }) => void saveToken(token));
    await FirebaseMessaging.addListener('notificationReceived', (notification) => {
      window.dispatchEvent(new CustomEvent('native-push-received', { detail: notification }));
    });
    await FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
      const data = notification.data;
      navigateTo(typeof data === 'object' && data !== null ? (data as { path?: unknown }).path : undefined);
    });
  }

  // Uygulama kapalıyken bildirime dokunularak açıldıysa yönlendirmeyi kaçırma
  try {
    const launch = await FirebaseMessaging.getDeliveredNotifications();
    const pending = launch.notifications?.[0]?.data as { path?: unknown } | undefined;
    if (pending?.path) navigateTo(pending.path);
  } catch {
    // sessizce geç: bazı platformlarda desteklenmiyor
  }

  const { token } = await FirebaseMessaging.getToken();
  if (token) await saveToken(token);
}

export async function unregisterPushNotifications() {
  currentUserId = null;
  if (!isNative()) return;

  const token = localStorage.getItem(LAST_TOKEN_KEY);
  if (token) {
    await supabase.from('device_tokens').delete().eq('token', token);
    localStorage.removeItem(LAST_TOKEN_KEY);
  }
  try {
    await FirebaseMessaging.deleteToken();
  } catch {
    // token zaten yoksa sorun değil
  }
}
