import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const normalizePhone = (value: string) => value.replace(/\s+/g, "").trim();

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

    const normalizedPhone = normalizePhone(phone);
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: otpRecord, error: fetchError } = await supabase
      .from("otp_codes")
      .select("id")
      .eq("phone", normalizedPhone)
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

    // NOTE: We mark the OTP as verified AFTER successful user creation/sign-in below

    const tempPassword = `otp_verified_${normalizedPhone}`;

    const { data: listedUsers, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("List users error:", listError);
      throw new Error("Kullanıcı listesi alınamadı");
    }

    let authUser = listedUsers.users.find(
      (user) => normalizePhone(user.phone ?? "") === normalizedPhone
    );

    if (!authUser) {
      const { data: createData, error: createError } = await supabase.auth.admin.createUser({
        phone: normalizedPhone,
        phone_confirm: true,
        password: tempPassword,
        user_metadata: { phone_verified: true },
      });

      if (createError) {
        if ((createError as { code?: string }).code === "phone_exists") {
          const { data: retryUsers, error: retryListError } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
          });

          if (retryListError) {
            console.error("Retry list users error:", retryListError);
            throw new Error("Mevcut kullanıcı bulunamadı");
          }

          authUser = retryUsers.users.find(
            (user) => normalizePhone(user.phone ?? "") === normalizedPhone
          );

          if (!authUser) {
            console.error("Phone exists but user could not be found:", normalizedPhone);
            throw new Error("Mevcut kullanıcı bulunamadı");
          }
        } else {
          console.error("Create user error:", createError);
          throw new Error("Kullanıcı oluşturulamadı");
        }
      } else {
        authUser = createData.user;
      }
    }

    if (!authUser) {
      throw new Error("Kullanıcı bulunamadı");
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      password: tempPassword,
      phone_confirm: true,
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        phone_verified: true,
      },
    });

    if (updateError) {
      console.error("Update user error:", updateError);
      throw new Error("Kullanıcı güncellenemedi");
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      phone: normalizedPhone,
      password: tempPassword,
    });

    if (signInError || !signInData.session) {
      console.error("Sign in error:", signInError);
      throw new Error("Giriş yapılamadı");
    }

    // Mark OTP as used only after successful sign-in
    await supabase.from("otp_codes").update({ verified: true }).eq("id", otpRecord.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("user_id", authUser.id)
      .maybeSingle();

    const needsProfile = !profile || !profile.full_name?.trim();

    return new Response(
      JSON.stringify({ success: true, session: signInData.session, needsProfile }),
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
