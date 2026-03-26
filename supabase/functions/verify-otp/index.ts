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

    // Find valid OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Kod hatalı veya süresi dolmuş" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as verified
    await supabase
      .from("otp_codes")
      .update({ verified: true })
      .eq("id", otpRecord.id);

    // Check if user exists by phone
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u) => u.phone === phone);

    const tempPassword = `otp_verified_${phone}`;
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Update password for sign-in
      await supabase.auth.admin.updateUserById(userId, {
        password: tempPassword,
        phone_confirm: true,
      });
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        phone,
        phone_confirm: true,
        password: tempPassword,
        user_metadata: { phone_verified: true },
      });

      if (createError) {
        console.error("Create user error:", createError);
        throw new Error("Kullanıcı oluşturulamadı");
      }
      userId = newUser.user.id;
    }

    // Sign in to get session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      phone,
      password: tempPassword,
    });

    if (signInError) {
      console.error("Sign in error:", signInError);
      throw new Error("Giriş yapılamadı");
    }

    const session = signInData.session;
    if (!session) {
      throw new Error("Oturum oluşturulamadı");
    }

    // Check profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("user_id", userId)
      .single();

    const needsProfile = !profile || !profile.full_name;

    return new Response(
      JSON.stringify({ success: true, session, needsProfile }),
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
