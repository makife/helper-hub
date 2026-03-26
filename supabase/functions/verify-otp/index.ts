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
    const { phone, code } = await req.json();
    if (!phone || !code) {
      return new Response(
        JSON.stringify({ error: "Telefon ve kod gerekli" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify OTP code
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_codes")
      .select("id")
      .eq("phone", phone)
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Kod hatalı veya süresi dolmuş" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tempPassword = `otp_verified_${phone}`;

    // Strategy: Try to create user. If phone_exists, find and update existing.
    let userId: string;

    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      phone,
      phone_confirm: true,
      password: tempPassword,
      user_metadata: { phone_verified: true },
    });

    if (createError) {
      const errorCode = (createError as { code?: string }).code;
      
      if (errorCode === "phone_exists") {
        // User exists - find them by listing all users and matching phone
        // Phone could be stored with or without + prefix
        const { data: listedUsers, error: listError } = await supabase.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

        if (listError) {
          console.error("List users error:", listError);
          throw new Error("Kullanıcı listesi alınamadı");
        }

        // Normalize: strip all non-digit chars for comparison
        const phoneDigits = phone.replace(/\D/g, "");
        const foundUser = listedUsers.users.find((u) => {
          const userDigits = (u.phone ?? "").replace(/\D/g, "");
          return userDigits === phoneDigits;
        });

        if (!foundUser) {
          console.error("Phone exists but user not found. Phone:", phone, "phoneDigits:", phoneDigits);
          console.error("All user phones:", listedUsers.users.map(u => u.phone));
          throw new Error("Mevcut kullanıcı bulunamadı");
        }

        userId = foundUser.id;

        // Update password for sign-in
        await supabase.auth.admin.updateUserById(userId, {
          password: tempPassword,
          phone_confirm: true,
        });
      } else {
        console.error("Create user error:", createError);
        throw new Error("Kullanıcı oluşturulamadı");
      }
    } else {
      userId = createData.user.id;
    }

    // Sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      phone,
      password: tempPassword,
    });

    if (signInError || !signInData.session) {
      console.error("Sign in error:", signInError, "phone used:", phone);
      
      // Try sign-in with phone without + prefix
      const phoneWithout = phone.startsWith("+") ? phone.slice(1) : phone;
      const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
        phone: phoneWithout,
        password: tempPassword,
      });

      if (retryError || !retryData.session) {
        console.error("Retry sign in error:", retryError, "phone used:", phoneWithout);
        throw new Error("Giriş yapılamadı");
      }

      // Mark OTP as used
      await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("user_id", userId)
        .maybeSingle();

      return new Response(
        JSON.stringify({
          success: true,
          session: retryData.session,
          needsProfile: !profile || !profile.full_name?.trim(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark OTP as used
    await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("user_id", userId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        success: true,
        session: signInData.session,
        needsProfile: !profile || !profile.full_name?.trim(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("verify-otp error:", error);
    const message = error instanceof Error ? error.message : "Bilinmeyen hata";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
