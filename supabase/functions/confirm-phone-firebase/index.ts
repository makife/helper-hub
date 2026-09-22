// Firebase Phone Authentication ID token'ını doğrular ve numarayı profile yazar.
// Firebase oturumu uygulama oturumu DEĞİLDİR; sadece "bu numara bu kullanıcıya ait"
// kanıtı olarak kullanılır.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6";

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

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID")!;
    if (!FIREBASE_PROJECT_ID) return json({ ok: false, reason: "not_configured" }, 500);

    // 1) Uygulama oturumu
    const authHeader = req.headers.get("Authorization") || "";
    const authClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ ok: false, reason: "unauthorized" }, 401);

    // 2) Firebase ID token doğrulama
    const payload = await req.json().catch(() => ({}));
    const idToken = String(payload.idToken ?? "");
    if (!idToken) return json({ ok: false, reason: "invalid_code" });

    let phone = "";
    try {
      const { payload: claims } = await jwtVerify(idToken, JWKS, {
        issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
        audience: FIREBASE_PROJECT_ID,
      });
      phone = String((claims as Record<string, unknown>).phone_number ?? "");
    } catch (e) {
      console.error("Firebase token doğrulanamadı:", e);
      return json({ ok: false, reason: "invalid_code" });
    }

    if (!/^\+\d{10,15}$/.test(phone)) return json({ ok: false, reason: "invalid_phone" });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 3) Aynı numara başka hesapta olamaz
    const { data: taken } = await admin
      .from("profiles")
      .select("user_id")
      .eq("phone", phone)
      .neq("user_id", user.id)
      .maybeSingle();
    if (taken) return json({ ok: false, reason: "phone_taken" });

    const { error } = await admin.from("profiles").update({ phone }).eq("user_id", user.id);
    if (error) {
      console.error("Profil güncellenemedi:", error.message);
      return json({ ok: false, reason: "save_failed" });
    }

    return json({ ok: true, phone });
  } catch (e) {
    console.error("confirm-phone-firebase:", e);
    return json({ ok: false, reason: "unknown" });
  }
});
