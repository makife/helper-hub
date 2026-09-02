import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  getPendingReferralCode,
  clearPendingReferralCode,
} from "@/lib/nativeAuth";
import { useT } from "@/lib/i18n";

/**
 * Davet kodu beklemedeyse (linkle gelinmişse) ana sayfada açılan kabul diyaloğu.
 * Onboarding'i atlamış / daha önce kaydolmuş kullanıcılar için de çalışır.
 */
const ReferralPrompt = () => {
  const { user } = useAuth();
  const t = useT();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const code = getPendingReferralCode();
    if (!code) return;

    supabase
      .from("profiles")
      .select("referred_by, referral_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.referral_code?.toUpperCase() === code || data.referred_by) {
          clearPendingReferralCode();
          return;
        }
        setPendingCode(code);
      });
  }, [user]);

  const handleAccept = async () => {
    if (!pendingCode || !user) return;
    setSubmitting(true);

    const { data: referrer } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("referral_code", pendingCode)
      .maybeSingle();

    if (!referrer) {
      toast.error(t("Geçersiz davet kodu."));
      setSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.user_id })
      .eq("user_id", user.id);

    setSubmitting(false);

    if (error) {
      toast.error(t("Davet kodu kaydedilemedi."));
      console.error(error);
      return;
    }

    clearPendingReferralCode();
    setPendingCode(null);
    toast.success(t("Davet kodu kabul edildi! İkinize de 1'er kredi hediye edildi. 🎉"));
  };

  const handleSkip = () => {
    clearPendingReferralCode();
    setPendingCode(null);
  };

  return (
    <AnimatePresence>
      {pendingCode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-sm overflow-hidden rounded-3xl bg-card p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-foreground">{t("Arkadaşın seni davet etti")}</h3>
                <p className="text-xs text-muted-foreground">{t("Davet kodunu kabul edersen ikinize de 1'er kredi hediye.")}</p>
              </div>
            </div>

            <div className="mb-5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-center">
              <p className="text-xs font-semibold text-muted-foreground">{t("Davet kodu")}</p>
              <p className="text-2xl font-black tracking-widest text-primary">{pendingCode}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 rounded-2xl border-2 border-border bg-card py-3 text-sm font-bold text-foreground transition-all active:scale-[0.98]"
              >
                {t("Sonra")}
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting}
                className="flex-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? t("Kaydediliyor...") : t("Kabul Et")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ReferralPrompt;
