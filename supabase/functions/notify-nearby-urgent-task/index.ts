import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/firebase_messaging';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URGENT_RADIUS_M = 15_000; // 15 km
const NORMAL_RADIUS_M = 10_000; // 10 km
const MAX_RECIPIENTS = 300;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const connectionKey = Deno.env.get('FIREBASE_MESSAGING_API_KEY');
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !lovableApiKey || !connectionKey) {
      return json({ error: 'Push provider is not configured' }, 500);
    }

    // Bu fonksiyonu sadece giriş yapmış kullanıcılar, kendi görevleri için
    // çağırabilir — client bir "secret" bilmek zorunda değil, kendi
    // Supabase oturum JWT'siyle doğrulanıyor.
    const authHeader = req.headers.get('Authorization') ?? '';
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser();
    if (userError || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    const callerId = userData.user.id;

    const payload = await req.json().catch(() => null) as Record<string, unknown> | null;
    const taskId = payload?.task_id;
    if (typeof taskId !== 'string' || !UUID_RE.test(taskId)) return json({ error: 'Invalid task_id' }, 400);

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: task, error: taskError } = await admin
      .from('tasks')
      .select('id, owner_id, title, urgency, status, latitude, longitude, price, current_price, urgent_push_sent')
      .eq('id', taskId)
      .maybeSingle();
    if (taskError || !task) return json({ error: 'Görev bulunamadı' }, 404);

    // Sadece görevin sahibi tetikleyebilir; sadece açık+acil işler; tekrar göndermeyi engelle
    if (task.owner_id !== callerId) return json({ error: 'Yetkisiz' }, 403);
    if (task.status !== 'open') {
      return json({ sent: 0, reason: 'not-open' });
    }
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

    const userIds = (nearby || []).map((r: { user_id: string }) => r.user_id).slice(0, MAX_RECIPIENTS);
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
    const languages = new Map((recipientProfiles ?? []).map((profile: { user_id: string; language: string | null }) => [profile.user_id, profile.language]));
    const headers = {
      Authorization: `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': connectionKey,
      'Content-Type': 'application/json',
    };

    let sent = 0;
    const staleIds: string[] = [];
    for (const row of tokenRows) {
      const response = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: {
              title: languages.get(row.user_id) === 'en'
                ? (isUrgent ? '🔥 An urgent task is nearby!' : '🖐️ A new task is nearby')
                : (isUrgent ? '🔥 Yakınında acil bir iş var!' : '🖐️ Yakınında yeni bir iş var'),
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
              payload: { aps: { sound: 'default', badge: 1, 'interruption-level': isUrgent ? 'time-sensitive' : 'active' } },
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
