import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import { useT } from "@/lib/i18n";

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const t = useT();

  useEffect(() => {
    if (!loading && user) {
      navigate("/home", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <img src={logo} alt="Bi' El At" width={80} height={80} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 safe-top safe-bottom">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="mb-6"
      >
        <img src={logo} alt="Bi' El At" width={120} height={120} />
      </motion.div>

      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="mb-2 text-4xl font-black text-foreground"
      >
        Bi'El At
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="mb-12 text-center text-lg text-muted-foreground"
      >
        {t("Yardım al, Yardım et.")}
      </motion.p>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.5 }}
        className="flex w-full max-w-sm flex-col gap-3"
      >
        <button
          onClick={() => navigate("/onboarding")}
          className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]"
        >
          {t("Başlayalım")}
        </button>

        <button
          onClick={() => navigate("/login")}
          className="w-full rounded-2xl border-2 border-border bg-card px-6 py-4 text-lg font-bold text-foreground transition-colors active:bg-muted"
        >
          {t("Zaten hesabım var")}
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="mt-8 text-center text-xs text-muted-foreground"
      >
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
      </motion.p>
    </div>
  );
};

export default Welcome;
