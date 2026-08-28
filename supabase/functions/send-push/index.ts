import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/firebase_messaging';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const hookSecret = Deno.env.get('PUSH_HOOK_SECRET');
    if (!hookSecret || req.headers.get('x-push-secret') !== hookSecret) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const connectionKey = Deno.env.get('FIREBASE_MESSAGING_API_KEY');
    if (!lovableApiKey || !connectionKey) {
      return json({ error: 'Push provider is not configured' }, 500);
    }

    const payload = await req.json().catch(() => null);
    const userId = payload?.user_id;
    const title = typeof payload?.title === 'string' ? payload.title.slice(0, 120) : '';
    const body = typeof payload?.body === 'string' ? payload.body.slice(0, 300) : '';
    const path = typeof payload?.path === 'string' ? payload.path.slice(0, 200) : '/';

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof userId !== 'string' || !uuidRe.test(userId) || !title) {
      return json({ error: 'Invalid payload' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('id, token')
      .eq('user_id', userId);

    if (tokensError) {
      console.error('device_tokens query failed:', tokensError.message);
      return json({ error: 'Could not read device tokens' }, 500);
    }
    if (!tokens?.length) {
      return json({ sent: 0, reason: 'no-devices' });
    }

    const headers = {
      Authorization: `Bearer ${lovableApiKey}`,
      'X-Connection-Api-Key': connectionKey,
      'Content-Type': 'application/json',
    };

    let sent = 0;
    const staleIds: string[] = [];

    for (const row of tokens) {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: { title, body },
            data: { path },
            android: { priority: 'HIGH', notification: { sound: 'default' } },
            apns: { payload: { aps: { sound: 'default', badge: 1 } } },
          },
        }),
      });

      if (res.ok) {
        sent++;
        continue;
      }

      const errorBody = await res.text();
      console.error(`FCM send failed [${res.status}]: ${errorBody}`);
      if (res.status === 404 || res.status === 400) {
        staleIds.push(row.id);
      }
    }

    if (staleIds.length) {
      await supabase.from('device_tokens').delete().in('id', staleIds);
    }

    return json({ sent, removed: staleIds.length });
  } catch (e) {
    console.error('send-push error:', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
