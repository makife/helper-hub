import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FCM_PROJECT_ID = 'bielat-1c00a';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URGENT_RADIUS_M = 15_000;
const NORMAL_RADIUS_M = 10_000;
const MAX_RECIPIENTS = 300;

async function getFCMAccessToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const pemKey = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\n/g, '');
  const binaryKey = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${signingInput}.${signatureBase64}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !serviceAccountJson)
      return json({ error: 'Push provider is not configured' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    const callerId = userData.user.id;

    const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const taskId = payload?.task_id;
    if (typeof taskId !== 'string' || !UUID_RE.test(taskId))
      return json({ error: 'Invalid task_id' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: task, error: taskError } = await admin
      .from('tasks')
      .select('id, owner_id, title, urgency, status, latitude, longitude, price, current_price, urgent_push_sent')
      .eq('id', taskId)
      .maybeSingle();
    if (taskError || !task) return json({ error: 'Görev bulunamadı' }, 404);

    if (task.owner_id !== callerId) return json({ error: 'Yetkisiz' }, 403);
    if (task.status !== 'open') return json({ sent: 0, reason: 'not-open' });
    const isUrgent = task.urgency === 'urgent';
    if (task.urgent_push_sent) return json({ sent: 0, reason: 'already-sent' });
    if (task.latitude == null || task.longitude == null) return json({ sent: 0, reason: 'no-location' });

    const { data: nearby, error: nearbyError } = await admin.rpc('nearby_helper_ids', {
      _lat: task.latitude,
      _lng: task.longitude,
      _radius_m: isUrgent ? URGENT_RADIUS_M : NORMAL_RADIUS_M,
      _exclude_user_id: task.owner_id,
    });
    if (nearbyError) {
      console.error('nearby_helper_ids error:', nearbyError.message);
      return json({ error: 'Yakındaki kullanıcılar bulunamadı' }, 500);
    }

    const userIds = (nearby || [])
      .map((r: { user_id: string }) => r.user_id)
      .slice(0, MAX_RECIPIENTS);
    if (userIds.length === 0) {
      await admin.from('tasks').update({ urgent_push_sent: true }).eq('id', taskId);
      return json({ sent: 0, reason: 'no-nearby-users' });
    }

    const { data: tokenRows, error: tokenError } = await admin
      .from('device_tokens')
      .select('id, token, user_id')
      .in('user_id', userIds);
    if (tokenError) return json({ error: 'Cihaz tokenları okunamadı' }, 500);
    if (!tokenRows?.length) {
      await admin.from('tasks').update({ urgent_push_sent: true }).eq('id', taskId);
      return json({ sent: 0, reason: 'no-devices' });
    }

    const price = task.current_price ?? task.price;
    const { data: recipientProfiles } = await admin
      .from('profiles')
      .select('user_id, language')
      .in('user_id', userIds);
    const languages = new Map(
      (recipientProfiles ?? []).map((p: { user_id: string; language: string | null }) => [p.user_id, p.language]),
    );

    const accessToken = await getFCMAccessToken(serviceAccountJson);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    let sent = 0;
    const staleIds: string[] = [];
    for (const row of tokenRows) {
      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: {
              title:
                languages.get(row.user_id) === 'en'
                  ? isUrgent ? '🔥 An urgent task is nearby!' : '🖐️ A new task is nearby'
                  : isUrgent ? '🔥 Yakınında acil bir iş var!' : '🖐️ Yakınında yeni bir iş var',
              body: `${task.title} — ₺${price}`,
            },
            data: { path: `/?task=${taskId}` },
            android: {
              priority: isUrgent ? 'HIGH' : 'NORMAL',
              notification: {
                sound: 'default',
                channel_id: 'bielat_alerts_v2',
                notification_priority: isUrgent ? 'PRIORITY_MAX' : 'PRIORITY_DEFAULT',
                default_vibrate_timings: true,
                visibility: 'PUBLIC',
              },
            },
            apns: {
              headers: { 'apns-priority': isUrgent ? '10' : '5' },
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1,
                  'interruption-level': isUrgent ? 'time-sensitive' : 'active',
                },
              },
            },
          },
        }),
      });
      if (response.ok) sent++;
      else {
        const details = await response.text();
        console.error(`FCM send failed [${response.status}]: ${details}`);
        if (response.status === 404 || response.status === 400) staleIds.push(row.id);
      }
    }
    if (staleIds.length) await admin.from('device_tokens').delete().in('id', staleIds);

    await admin.from('tasks').update({ urgent_push_sent: true }).eq('id', taskId);

    return json({ sent, recipients: userIds.length, removed: staleIds.length });
  } catch (error) {
    console.error('notify-nearby-urgent-task error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
