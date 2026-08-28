import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

/** RevenueCat ürün kimliği → kredi (bonus dahil) */
const PRODUCT_CREDITS: Record<string, number> = {
  credits_5: 5,
  credits_15: 17,
  credits_40: 48,
  credits_100: 125,
};

/** Kredi yükleyen olaylar */
const GRANT_EVENTS = ["INITIAL_PURCHASE", "NON_RENEWING_PURCHASE", "RENEWAL", "UNCANCELLATION"];
/** Kredi geri alan olaylar */
const REVOKE_EVENTS = ["CANCELLATION", "REFUND"];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const authHeader = req.headers.get("Authorization") ?? "";
  const provided = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!secret || provided !== secret) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: { event?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const event = payload?.event;
  if (!event || typeof event !== "object") return json({ error: "Missing event" }, 400);

  const eventId = String(event.id ?? "");
  const type = String(event.type ?? "");
  const appUserId = String(event.app_user_id ?? "");
  const productIdRaw = String(event.product_id ?? "");
  const productId = productIdRaw.split(":")[0];

  if (!eventId || !type || !appUserId) return json({ error: "Incomplete event" }, 400);

  // TEST / bilgilendirme olayları
  if (!GRANT_EVENTS.includes(type) && !REVOKE_EVENTS.includes(type)) {
    return json({ status: "ignored", type });
  }

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(appUserId)) {
    return json({ status: "ignored", reason: "anonymous_app_user_id" });
  }

  const base = PRODUCT_CREDITS[productId];
  if (!base) return json({ status: "ignored", reason: "unknown_product", productId });

  const credits = REVOKE_EVENTS.includes(type) ? -base : base;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase.rpc("grant_store_credits", {
    _event_id: eventId,
    _user_id: appUserId,
    _product_id: productId,
    _credits: credits,
    _event_type: type,
    _store: event.store ?? null,
    _price: event.price ?? null,
    _currency: event.currency ?? null,
    _raw: event,
  });

  if (error) {
    console.error("grant_store_credits error", error);
    return json({ error: "Processing failed" }, 500);
  }

  return json({ status: data, credits });
});
