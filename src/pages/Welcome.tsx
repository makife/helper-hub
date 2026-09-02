import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import { useI18n } from "@/lib/i18n";

const Welcome = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [langOpen, setLangOpen] = useState(false);

  const flags: Record<string, ReactNode> = {
    tr: (
      <svg viewBox="0 0 640 480" className="h-4 w-auto rounded-sm">
        <rect width="640" height="480" fill="#E30A17" />
        <circle cx="220" cy="240" r="120" fill="#FFFFFF" />
        <circle cx="256" cy="240" r="96" fill="#E30A17" />
        <path
          d="M520.6,240 L483.8,266.8 L497.9,310.2 L461.1,283.4 L424.3,310.2 L438.4,266.8 L401.6,240 L447.1,240 L461.1,196.6 L475.2,240 Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
    en: (
      <svg viewBox="0 0 640 480" className="h-4 w-auto rounded-sm">
        <rect width="640" height="480" fill="#012169" />
        <path d="M0 0 L640 480 M640 0 L0 480" stroke="#FFFFFF" strokeWidth="60" />
        <path d="M0 0 L640 480 M640 0 L0 480" stroke="#C8102E" strokeWidth="40" />
        <path d="M320 0 V480 M0 240 H640" stroke="#FFFFFF" strokeWidth="100" />
        <path d="M320 0 V480 M0 240 H640" stroke="#C8102E" strokeWidth="60" />
      </svg>
    ),
  };

  const langOptions = [
    { code: "tr" as const, label: "Türkçe" },
    { code: "en" as const, label: "English" },
  ];

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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-6 safe-top safe-bottom">
      <div className="absolute right-4 top-4 z-20">
        <button
          onClick={() => setLangOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-black text-foreground shadow-sm"
        >
          <span className="flex items-center">{flags[lang]}</span>
          <span>{lang.toUpperCase()}</span>
          <ChevronDown
            size={14}
            className={`transition-transform ${langOpen ? "rotate-180" : ""}`}
          />
        </button>
        {langOpen && (
          <div className="absolute right-0 top-full mt-1 flex w-36 flex-col rounded-xl border border-border bg-card p-1 shadow-lg">
            {langOptions.map((o) => (
              <button
                key={o.code}
                onClick={() => {
                  setLang(o.code);
                  setLangOpen(false);
                }}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                  lang === o.code
                    ? "gradient-warm text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <span className="flex items-center">{flags[o.code]}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

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
        {t("Devam ederek")} {" "}
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
        {t("nı kabul etmiş olursunuz.")}
      </motion.p>
    </div>
  );
};

export default Welcome;
