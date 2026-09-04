import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isNativePlatform, signInNativeOAuth } from "@/lib/nativeAuth";

import logo from "@/assets/logo.png";
import { useT } from "@/lib/i18n";

const getPlatform = () => {
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios" as const;
  if (/Android/i.test(ua)) return "android" as const;
  return "web" as const;
};

const Login = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const t = useT();
  const [pending, setPending] = useState<"google" | "apple" | null>(null);
  const platform = getPlatform();

  const signInWeb = async (provider: "google" | "apple") => {
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
      extraParams: provider === "google" ? { prompt: "select_account" } : undefined,
    });
    if (result.error) throw result.error;
    setPending(null);
  };

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      navigate(profile?.full_name?.trim() ? "/home" : "/profile-setup", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  const signIn = async (provider: "google" | "apple") => {
    setPending(provider);
    try {
      if (isNativePlatform()) {
        // Native APK: platformun kendi hesap seçicisini kullanır.
        await signInNativeOAuth(provider);
        setPending(null);
        return;
      }

      await signInWeb(provider);
    } catch (err) {
      console.error("OAuth error:", err);
      toast.error(t("Giriş yapılamadı, tekrar dene."), { duration: 6000 });
      setPending(null);
    }
  };

  const showGoogle = true;
  const showApple = platform !== "android";

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12 safe-top safe-bottom">
      <div className="mb-2 mt-2 flex h-10 items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-20 items-center justify-center gap-1 rounded-full p-0 text-sm font-bold leading-none text-foreground transition-all active:scale-[0.98]"
        >
          <ChevronLeft size={18} className="text-primary" />
          <span className="leading-none">{t("Geri")}</span>
        </button>
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-1 flex-col items-center justify-center text-center"
      >
        <motion.img
          src={logo}
          alt="Bi' El At"
          width={88}
          height={88}
          className="mb-6 origin-bottom-left"
          animate={{ rotate: [0, -20, 20, -20, 20, -20, 20, 0] }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
        />
        <h1 className="mb-2 text-3xl font-black text-foreground">{t("Giriş Yap")}</h1>
        <p className="text-base text-muted-foreground">
          {t("Hesabınla saniyeler içinde giriş yap, hemen yardımlaşmaya başla.")}
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex flex-col gap-3"
      >
        {showGoogle && (
          <button
            onClick={() => signIn("google")}
            disabled={pending !== null}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-border bg-card px-6 py-4 text-lg font-bold text-foreground transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.1h6.6c-.1 1.1-.9 2.8-2.5 3.9l-.02.2 3.6 2.8.3.03c2.3-2.1 3.6-5.3 3.6-8.8Z" />
              <path fill="#34A853" d="M12 24c3.3 0 6-1.1 8-3l-3.8-3c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.9-5l-.2.02-3.7 2.9-.05.2C3.1 21.3 7.2 24 12 24Z" />
              <path fill="#FBBC05" d="M5.1 14.2c-.3-.8-.4-1.6-.4-2.2 0-.8.1-1.5.4-2.2v-.3L1.3 6.6l-.1.06A11.9 11.9 0 0 0 0 12c0 1.9.5 3.8 1.2 5.4l3.9-3.2Z" />
              <path fill="#EA4335" d="M12 4.7c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.3 0 12 0 7.2 0 3.1 2.7 1.2 6.6l3.9 3.2c1-3 3.7-5.1 6.9-5.1Z" />
            </svg>
            {pending === "google" ? t("Yönlendiriliyor...") : t("Google ile devam et")}
          </button>
        )}

        {showApple && (
          <button
            onClick={() => signIn("apple")}
            disabled={pending !== null}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-foreground px-6 py-4 text-lg font-bold text-background transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M16.4 12.7c0-2.6 2.1-3.9 2.2-4-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.3-.9-1.7 0-3.3 1-4.2 2.5-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.5 1.3-.05 1.8-.8 3.3-.8 1.5 0 2 .8 3.3.8 1.4 0 2.2-1.2 3.1-2.5.98-1.4 1.4-2.8 1.4-2.9-.03-.01-2.7-1-2.7-3.8ZM14 3.9c.7-.9 1.2-2.1 1-3.3-1 .04-2.3.7-3 1.6-.7.8-1.3 2-1.1 3.2 1.1.09 2.3-.6 3.1-1.5Z" />
            </svg>
            {pending === "apple" ? t("Yönlendiriliyor...") : t("Apple ile devam et")}
          </button>
        )}

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Devam ederek{" "}
          <button
            onClick={() => navigate("/terms")}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            {t("Kullanım Koşulları")}
          </button>{" "}
          ve{" "}
          <button
            onClick={() => navigate("/privacy")}
            className="font-semibold text-primary underline-offset-2 hover:underline"
          >
            {t("Gizlilik Politikası")}
          </button>
          'nı kabul etmiş olursunuz.
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
