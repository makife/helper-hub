import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ ok: false, reason: "unauthorized" }, 401);

    const payload = await req.json().catch(() => ({}));
    const phone = String(payload.phone ?? "").trim();
    const code = String(payload.code ?? "").trim();

    if (!/^\+90\d{10}$/.test(phone) || !/^\d{6}$/.test(code)) {
      return json({ ok: false, reason: "invalid_input" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: otp } = await admin
      .from("otp_codes")
      .select("id")
      .eq("phone", phone)
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!otp) return json({ ok: false, reason: "invalid_code" });

    // Aynı numara başka bir hesapta doğrulanmış olamaz
    const { data: taken } = await admin
      .from("profiles")
      .select("user_id")
      .eq("phone", phone)
      .neq("user_id", user.id)
      .maybeSingle();
    if (taken) return json({ ok: false, reason: "phone_taken" });

    await admin.from("otp_codes").update({ verified: true }).eq("id", otp.id);

    const { error } = await admin.from("profiles").update({ phone }).eq("user_id", user.id);
    if (error) return json({ ok: false, reason: "save_failed" });

    return json({ ok: true });
  } catch (_e) {
    return json({ ok: false, reason: "error" });
  }
});
