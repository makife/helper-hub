import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';

const isNative = () => Capacitor.isNativePlatform();

export async function initializePushNotifications(userId: string) {
  if (!isNative()) return;

  const permission = await PushNotifications.checkPermissions();
  const result = permission.receive === 'prompt'
    ? await PushNotifications.requestPermissions()
    : permission;

  if (result.receive !== 'granted') return;

  await PushNotifications.register();

  await PushNotifications.removeAllListeners();
  await PushNotifications.addListener('registration', async (token: Token) => {
    const platform = Capacitor.getPlatform();
    const { error } = await supabase.from('device_tokens').upsert(
      { user_id: userId, token: token.value, platform, updated_at: new Date().toISOString() },
      { onConflict: 'token' },
    );
    if (error) console.error('Device token could not be saved:', error.message);
  });

  await PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration failed:', error);
  });

  await PushNotifications.addListener('pushNotificationReceived', (notification) => {
    window.dispatchEvent(new CustomEvent('native-push-received', { detail: notification }));
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
    const path = notification.data?.path;
    if (typeof path === 'string' && path.startsWith('/')) {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  });
}

export async function unregisterPushNotifications() {
  if (!isNative()) return;
  await PushNotifications.removeAllListeners();
}
