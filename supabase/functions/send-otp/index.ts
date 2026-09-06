import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    if (!phone || !/^\+90\d{10}$/.test(phone)) {
      return new Response(
        JSON.stringify({ error: "Geçersiz telefon numarası" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    if (!TWILIO_ACCOUNT_SID) throw new Error("TWILIO_ACCOUNT_SID is not configured");

    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!TWILIO_AUTH_TOKEN) throw new Error("TWILIO_AUTH_TOKEN is not configured");

    const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
    if (!TWILIO_PHONE_NUMBER) throw new Error("TWILIO_PHONE_NUMBER is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Invalidate old codes
    await supabase
      .from("otp_codes")
      .update({ verified: true })
      .eq("phone", phone)
      .eq("verified", false);

    // Store new code
    const { error: insertError } = await supabase
      .from("otp_codes")
      .insert({ phone, code, expires_at: expiresAt });

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error("OTP kaydedilemedi");
    }

    // Send SMS via Twilio REST API directly
    const twilioBase = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}`;
    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

    // Verify the configured "From" number actually belongs to this Twilio account.
    // If not, fall back to the first SMS-capable number owned by the account.
    // Optional: a Messaging Service handles the "From" number automatically.
    const MESSAGING_SERVICE_SID = Deno.env.get("TWILIO_MESSAGING_SERVICE_SID");

    let fromNumber = TWILIO_PHONE_NUMBER;
    if (!MESSAGING_SERVICE_SID) {
      // Verify the configured "From" number actually belongs to this Twilio account.
      const numbersRes = await fetch(`${twilioBase}/IncomingPhoneNumbers.json?PageSize=50`, {
        headers: { Authorization: `Basic ${credentials}` },
      });
      const numbersData = await numbersRes.json();
      if (numbersRes.status === 401 || numbersRes.status === 403) {
        throw new Error(
          "Twilio kimlik bilgileri geçersiz. TWILIO_ACCOUNT_SID ve TWILIO_AUTH_TOKEN değerlerini kontrol et."
        );
      }
      if (numbersRes.ok) {
        const owned = (numbersData.incoming_phone_numbers ?? []) as Array<{
          phone_number: string;
          capabilities?: { sms?: boolean };
        }>;
        const digits = (v: string) => v.replace(/\D/g, "");
        const match = owned.find((n) => digits(n.phone_number) === digits(TWILIO_PHONE_NUMBER));
        if (!match) {
          const smsCapable = owned.find((n) => n.capabilities?.sms !== false);
          if (!smsCapable) {
            throw new Error(
              `Bu Twilio hesabında SMS gönderebilecek bir numara tanımlı değil. ` +
                `Twilio'da bir numara satın al ve TWILIO_PHONE_NUMBER olarak ekle, ` +
                `ya da bir Messaging Service oluşturup TWILIO_MESSAGING_SERVICE_SID ekle.`
            );
          }
          console.warn("Configured From not owned by account; using account number instead");
          fromNumber = smsCapable.phone_number;
        }
      } else {
        console.error("Could not list Twilio numbers:", numbersData);
      }
    }

    const smsParams = new URLSearchParams({
      To: phone,
      Body: `Bi' El At doğrulama kodunuz: ${code}`,
    });
    if (MESSAGING_SERVICE_SID) {
      smsParams.set("MessagingServiceSid", MESSAGING_SERVICE_SID);
    } else {
      smsParams.set("From", fromNumber);
    }

    const smsResponse = await fetch(`${twilioBase}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: smsParams,
    });



    const smsData = await smsResponse.json();
    if (!smsResponse.ok) {
      console.error("Twilio error:", smsData);
      throw new Error(`SMS gönderilemedi [${smsResponse.status}]: ${JSON.stringify(smsData)}`);
    }

    console.log("SMS sent successfully:", smsData.sid);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-otp error:", error);
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
