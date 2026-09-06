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

// TC kimlik numarası algoritmik kontrolü (11 hane + kontrol basamakları)
const isValidTcAlgorithm = (tc: string): boolean => {
  if (!/^[1-9][0-9]{10}$/.test(tc)) return false;
  const d = tc.split("").map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const digit10 = (odd * 7 - even) % 10;
  if (digit10 !== d[9]) return false;
  const sum10 = d.slice(0, 10).reduce((a, b) => a + b, 0);
  return sum10 % 10 === d[10];
};

const upperTr = (s: string) =>
  s
    .replace(/i/g, "İ")
    .replace(/ı/g, "I")
    .toLocaleUpperCase("tr-TR")
    .trim()
    .replace(/\s+/g, " ");

const escapeXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// NVİ (Nüfus ve Vatandaşlık İşleri) açık doğrulama servisi
const askNvi = async (
  tc: string,
  firstName: string,
  lastName: string,
  birthYear: number,
): Promise<boolean> => {
  const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>${tc}</TCKimlikNo>
      <Ad>${escapeXml(firstName)}</Ad>
      <Soyad>${escapeXml(lastName)}</Soyad>
      <DogumYili>${birthYear}</DogumYili>
    </TCKimlikNoDogrula>
  </soap:Body>
</soap:Envelope>`;

  const res = await fetch("https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx", {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula",
    },
    body,
  });

  if (!res.ok) throw new Error(`NVI HTTP ${res.status}`);
  const text = await res.text();
  return /<TCKimlikNoDogrulaResult>\s*true\s*<\/TCKimlikNoDogrulaResult>/i.test(text);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const authClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await authClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const payload = await req.json().catch(() => ({}));
    const tc = String(payload.tcNo ?? "").replace(/\D/g, "");
    const firstName = upperTr(String(payload.firstName ?? ""));
    const lastName = upperTr(String(payload.lastName ?? ""));
    const birthYear = Number(payload.birthYear);

    const currentYear = new Date().getFullYear();
    if (
      !firstName ||
      !lastName ||
      firstName.length > 60 ||
      lastName.length > 60 ||
      !Number.isInteger(birthYear) ||
      birthYear < currentYear - 110 ||
      birthYear > currentYear - 18
    ) {
      return json({ ok: false, reason: "invalid_input" }, 200);
    }

    if (!isValidTcAlgorithm(tc)) {
      return json({ ok: false, reason: "invalid_tc" }, 200);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: profile } = await admin
      .from("profiles")
      .select("id_verification_status, id_verify_attempts, id_verify_last_attempt_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) return json({ ok: false, reason: "no_profile" }, 200);
    if (profile.id_verification_status === "verified") {
      return json({ ok: true, alreadyVerified: true });
    }

    // Basit hız sınırı: son 24 saatte en fazla 5 deneme
    const last = profile.id_verify_last_attempt_at ? new Date(profile.id_verify_last_attempt_at) : null;
    const within24h = last ? Date.now() - last.getTime() < 24 * 60 * 60 * 1000 : false;
    const attempts = within24h ? profile.id_verify_attempts ?? 0 : 0;
    if (attempts >= 5) return json({ ok: false, reason: "rate_limited" }, 200);

    let matched = false;
    try {
      matched = await askNvi(tc, firstName, lastName, birthYear);
    } catch (_e) {
      return json({ ok: false, reason: "service_unavailable" }, 200);
    }

    // NOT: TC kimlik numarası hiçbir yerde saklanmaz, loglanmaz.
    await admin
      .from("profiles")
      .update({
        id_verify_attempts: attempts + 1,
        id_verify_last_attempt_at: new Date().toISOString(),
        ...(matched
          ? {
              id_verification_status: "verified",
              id_verified_at: new Date().toISOString(),
              id_verification_note: "NVİ kimlik bilgileri doğrulandı",
            }
          : {}),
      })
      .eq("user_id", user.id);

    return json({ ok: matched, reason: matched ? undefined : "no_match" });
  } catch (_e) {
    return json({ ok: false, reason: "service_unavailable" }, 200);
  }
});
