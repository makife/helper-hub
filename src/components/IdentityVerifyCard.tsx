import { useState } from "react";
import { ShieldCheck, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

type Props = {
  status: string | null | undefined;
  verifiedAt?: string | null;
  onVerified?: () => void;
};

const IdentityVerifyCard = ({ status, verifiedAt, onVerified }: Props) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [tcNo, setTcNo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [busy, setBusy] = useState(false);

  const verified = status === "verified";

  const submit = async () => {
    if (busy) return;
    if (tcNo.length !== 11 || !firstName.trim() || !lastName.trim() || birthYear.length !== 4) {
      toast.error(t("Lütfen tüm alanları eksiksiz doldur."));
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-identity", {
        body: { tcNo, firstName, lastName, birthYear: Number(birthYear) },
      });
      if (error) throw error;
      const res = data as { ok?: boolean; reason?: string };
      if (res?.ok) {
        setTcNo("");
        setFirstName("");
        setLastName("");
        setBirthYear("");
        setOpen(false);
        toast.success(t("Kimlik bilgilerin doğrulandı."));
        onVerified?.();
        return;
      }
      const reason = res?.reason;
      if (reason === "invalid_tc") toast.error(t("Girdiğin TC kimlik numarası geçersiz."));
      else if (reason === "rate_limited") toast.error(t("Çok fazla deneme yaptın. Yarın tekrar dene."));
      else if (reason === "service_unavailable") toast.error(t("Doğrulama servisine şu an ulaşılamıyor. Sonra tekrar dene."));
      else if (reason === "invalid_input") toast.error(t("Bilgileri kontrol et. 18 yaşından büyük olmalısın."));
      else toast.error(t("Bilgiler kimlik kayıtlarıyla eşleşmedi."));
    } catch {
      toast.error(t("Doğrulama yapılamadı. Sonra tekrar dene."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-5 rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              verified ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
            }`}
          >
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-black text-foreground">{t("Kimlik Doğrulama")}</p>
            <p className="text-[11px] text-muted-foreground">
              {verified
                ? t("Kimlik bilgilerin doğrulandı")
                : t("Doğrulanmış üye rozeti kazan")}
            </p>
          </div>
        </div>
        {!verified && (
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary"
          >
            {open ? t("Vazgeç") : t("Doğrula")}
          </button>
        )}
      </div>

      {verified && verifiedAt && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {new Date(verifiedAt).toLocaleDateString("tr-TR")}
        </p>
      )}

      {!verified && open && (
        <div className="mt-4 space-y-2.5">
          <input
            value={tcNo}
            onChange={(e) => setTcNo(e.target.value.replace(/\D/g, "").slice(0, 11))}
            inputMode="numeric"
            placeholder={t("TC Kimlik No")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />
          <div className="flex gap-2.5">
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value.slice(0, 60))}
              placeholder={t("Ad")}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value.slice(0, 60))}
              placeholder={t("Soyad")}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <input
            value={birthYear}
            onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
            inputMode="numeric"
            placeholder={t("Doğum Yılı")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
          />

          <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3">
            <Lock size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {t(
                "Bilgilerin yalnızca resmi kimlik doğrulama servisine sorulur; TC kimlik numaran kaydedilmez, saklanmaz. Sadece doğrulandığı bilgisi ve tarihi tutulur.",
              )}
            </p>
          </div>

          <button
            onClick={submit}
            disabled={busy}
            className="gradient-warm flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {busy ? t("Doğrulanıyor...") : t("Kimliğimi Doğrula")}
          </button>
        </div>
      )}
    </div>
  );
};

export default IdentityVerifyCard;
