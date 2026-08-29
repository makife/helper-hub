import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { supabase } from '@/integrations/supabase/client';

const isNative = () => Capacitor.isNativePlatform();

async function saveToken(userId: string, token: string) {
  const { error } = await supabase.from('device_tokens').upsert(
    { user_id: userId, token, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
    { onConflict: 'token' },
  );
  if (error) console.error('Device token could not be saved:', error.message);
}

export async function initializePushNotifications(userId: string) {
  if (!isNative()) return;

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


  await FirebaseMessaging.removeAllListeners();
  await FirebaseMessaging.addListener('tokenReceived', ({ token }) => void saveToken(userId, token));
  await FirebaseMessaging.addListener('notificationReceived', (notification) => {
    window.dispatchEvent(new CustomEvent('native-push-received', { detail: notification }));
  });
  await FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
    const data = notification.data;
    const path = typeof data === 'object' && data !== null && 'path' in data
      ? (data as { path?: unknown }).path
      : undefined;
    if (typeof path === 'string' && path.startsWith('/')) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });

  const { token } = await FirebaseMessaging.getToken();
  if (token) await saveToken(userId, token);
}

export async function unregisterPushNotifications() {
  if (!isNative()) return;
  await FirebaseMessaging.removeAllListeners();
}
