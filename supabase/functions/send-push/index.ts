import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const FCM_PROJECT_ID = 'bielat-1c00a';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    const hookSecret = Deno.env.get('PUSH_HOOK_SECRET');
    if (!hookSecret || req.headers.get('x-push-secret') !== hookSecret)
      return json({ error: 'Unauthorized' }, 401);

    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceAccountJson || !supabaseUrl || !serviceRoleKey)
      return json({ error: 'Push provider is not configured' }, 500);

    const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const userId = payload?.user_id;
    const title = typeof payload?.title === 'string' ? payload.title.slice(0, 120) : '';
    const body = typeof payload?.body === 'string' ? payload.body.slice(0, 300) : '';
    const path =
      typeof payload?.path === 'string' && payload.path.startsWith('/')
        ? payload.path.slice(0, 200)
        : '/';
    if (typeof userId !== 'string' || !UUID_RE.test(userId) || !title)
      return json({ error: 'Invalid payload' }, 400);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('id, token')
      .eq('user_id', userId);
    if (tokensError) return json({ error: 'Could not read device tokens' }, 500);
    if (!tokens?.length) return json({ sent: 0, reason: 'no-devices' });

    const accessToken = await getFCMAccessToken(serviceAccountJson);
    const fcmUrl = `https://fcm.googleapis.com/v1/projects/${FCM_PROJECT_ID}/messages:send`;
    const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

    let sent = 0;
    const staleIds: string[] = [];
    for (const row of tokens) {
      const response = await fetch(fcmUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: { title, body },
            data: { path },
            android: {
              priority: 'HIGH',
              notification: {
                sound: 'default',
                channel_id: 'bielat_alerts_v2',
                notification_priority: 'PRIORITY_MAX',
                default_vibrate_timings: true,
                visibility: 'PUBLIC',
              },
            },
            apns: {
              headers: { 'apns-priority': '10' },
              payload: { aps: { sound: 'default', badge: 1, 'interruption-level': 'time-sensitive' } },
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
    if (staleIds.length) await supabase.from('device_tokens').delete().in('id', staleIds);
    return json({ sent, removed: staleIds.length });
  } catch (error) {
    console.error('send-push error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
