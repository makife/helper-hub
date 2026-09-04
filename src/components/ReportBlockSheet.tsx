import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flag, Ban, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { REPORT_REASONS, blockUser, isBlocked, reportUser, unblockUser } from "@/lib/blocks";

type Props = {
  userId: string;
  userName?: string | null;
  taskId?: string | null;
};

/** Bir kullanıcıyı şikayet etme / engelleme butonları ve penceresi */
const ReportBlockSheet = ({ userId, userName, taskId }: Props) => {
  const t = useT();
  const { user } = useAuth();
  const [blocked, setBlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].id);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || user.id === userId) return;
    isBlocked(user.id, userId).then(setBlocked);
  }, [user, userId]);

  if (!user || user.id === userId) return null;

  const toggleBlock = async () => {
    setBusy(true);
    const error = blocked ? await unblockUser(user.id, userId) : await blockUser(user.id, userId);
    setBusy(false);
    if (error) {
      toast.error(t("İşlem tamamlanamadı, lütfen tekrar dene."));
      return;
    }
    setBlocked(!blocked);
    toast.success(blocked ? t("Engel kaldırıldı") : t("Kullanıcı engellendi"));
  };

  const submitReport = async () => {
    setBusy(true);
    const error = await reportUser({
      reporterId: user.id,
      reportedId: userId,
      reason,
      details,
      taskId,
    });
    setBusy(false);
    if (error) {
      toast.error(t("Şikayet gönderilemedi, lütfen tekrar dene."));
      return;
    }
    setOpen(false);
    setDetails("");
    toast.success(t("Şikayetin alındı. En kısa sürede inceleyeceğiz."));
  };

  return (
    <>
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-xs font-bold text-foreground active:scale-[0.98]"
        >
          <Flag size={14} className="text-destructive" />
          {t("Şikayet Et")}
        </button>
        <button
          onClick={toggleBlock}
          disabled={busy}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold active:scale-[0.98] disabled:opacity-60 ${
            blocked
              ? "border-border bg-card text-foreground"
              : "border-destructive/20 bg-destructive/5 text-destructive"
          }`}
        >
          <Ban size={14} />
          {blocked ? t("Engeli Kaldır") : t("Engelle")}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 sm:items-center">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="max-h-[85vh] w-full overflow-y-auto rounded-t-3xl bg-background p-5 safe-bottom sm:max-w-sm sm:rounded-3xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-black text-foreground">{t("Şikayet Et")}</h2>
              <button onClick={() => setOpen(false)}>
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              {t("{name} hakkındaki şikayetin ekibimize iletilir.", { name: userName || t("Kullanıcı") })}
            </p>

            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setReason(r.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm font-bold ${
                    reason === r.id ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-foreground"
                  }`}
                >
                  {t(r.label)}
                  {reason === r.id && <Check size={16} />}
                </button>
              ))}
            </div>

            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              placeholder={t("Kısaca ne oldu? (isteğe bağlı)")}
              rows={3}
              className="mt-3 w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground outline-none focus:border-primary"
            />

            <button
              onClick={submitReport}
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-primary py-3.5 text-sm font-black text-primary-foreground disabled:opacity-60"
            >
              {busy ? t("Gönderiliyor...") : t("Şikayeti Gönder")}
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default ReportBlockSheet;
