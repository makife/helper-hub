import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Lock, Loader2, Clock, Check, X, Upload, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { compressImage } from "@/lib/imageCompress";
import {
  MAX_VERIFICATION_ATTEMPTS,
  VERIFICATION_KINDS,
  VerificationKind,
  VerificationRequest,
  fetchTrustScore,
  submitVerification,
} from "@/lib/trust";
import TrustStars from "@/components/TrustStars";
import { toast } from "sonner";

type Props = { userId: string; hasPhone: boolean };

const TrustVerificationCard = ({ userId, hasPhone }: Props) => {
  const t = useT();
  const [rows, setRows] = useState<VerificationRequest[]>([]);
  const [score, setScore] = useState(0);
  const [busy, setBusy] = useState<VerificationKind | null>(null);
  const pending = useRef<VerificationKind | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const [{ data }, s] = await Promise.all([
      supabase.from("verification_requests").select("*").eq("user_id", userId),
      fetchTrustScore(userId),
    ]);
    setRows((data ?? []) as VerificationRequest[]);
    setScore(s);
  };

  useEffect(() => {
    if (userId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const pick = (kind: VerificationKind) => {
    pending.current = kind;
    fileRef.current?.click();
  };

  const onFile = async (file?: File) => {
    const kind = pending.current;
    pending.current = null;
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !kind) return;
    setBusy(kind);
    const blob = await compressImage(file, 1600, 0.8);
    const res = await submitVerification(userId, kind, blob);
    setBusy(null);
    if (!res.ok) {
      if (res.reason === "too_many_attempts") toast.error(t("Bu belge için deneme hakkın doldu."));
      else if (res.reason === "already_approved") toast.error(t("Bu belge zaten onaylı."));
      else toast.error(t("Belge yüklenemedi. Tekrar dene."));
      return;
    }
    toast.success(t("Belgen incelemeye gönderildi."));
    load();
  };

  const rowFor = (kind: VerificationKind) => rows.find((r) => r.kind === kind);

  return (
    <div className="mb-5 rounded-2xl bg-card p-4 shadow-card">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-black text-foreground">{t("Güven Doğrulaması")}</p>
            <p className="text-[11px] text-muted-foreground">
              {t("Her onaylanan doğrulama 1 yıldız kazandırır")}
            </p>
          </div>
        </div>
        <TrustStars score={score} showLabel={false} />
      </div>

      <div className="space-y-2">
        {/* 1. yıldız: telefon */}
        <PhoneVerifyRow phone={phone} onVerified={() => { setPhone("+90"); load(); onPhoneVerified?.(); }} />


        {VERIFICATION_KINDS.map((k) => {
          const row = rowFor(k.id);
          const status = row?.status;
          const attemptsLeft = MAX_VERIFICATION_ATTEMPTS - (row?.attempts ?? 0);
          return (
            <div key={k.id} className="rounded-xl border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-foreground">{t(k.label)}</p>
                  <p className="text-[10px] text-muted-foreground">{t(k.description)}</p>
                </div>
                {status === "approved" ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
                    <Check size={11} /> {t("Onaylandı")}
                  </span>
                ) : status === "pending" ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                    <Clock size={11} /> {t("İncelemede")}
                  </span>
                ) : (
                  <button
                    onClick={() => pick(k.id)}
                    disabled={busy === k.id || attemptsLeft <= 0}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary disabled:opacity-40"
                  >
                    {busy === k.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Upload size={12} />
                    )}
                    {status === "rejected" ? t("Tekrar Yükle") : t("Yükle")}
                  </button>
                )}
              </div>
              {status === "rejected" && (
                <p className="mt-2 flex items-start gap-1.5 text-[10px] text-destructive">
                  <X size={11} className="mt-0.5 shrink-0" />
                  {row?.review_note || t("Belgen onaylanmadı. Daha net bir fotoğraf yükle.")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 p-3">
        <Lock size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t(
            "Belgelerini yalnızca yetkili ekibimiz görür. İnceleme bittikten sonra belgeler silinir; profilinde sadece doğrulandığı bilgisi kalır.",
          )}
        </p>
      </div>
    </div>
  );
};

export default TrustVerificationCard;
