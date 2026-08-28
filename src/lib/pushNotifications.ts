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

  await FirebaseMessaging.removeAllListeners();
  await FirebaseMessaging.addListener('tokenReceived', ({ token }) => void saveToken(userId, token));
  await FirebaseMessaging.addListener('notificationReceived', (notification) => {
    window.dispatchEvent(new CustomEvent('native-push-received', { detail: notification }));
  });
  await FirebaseMessaging.addListener('notificationActionPerformed', ({ notification }) => {
    const path = notification.data?.path;
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
