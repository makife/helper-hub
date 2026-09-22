import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import { sendPhoneCode, confirmPhoneCode, resetPhoneFlow } from "@/lib/phoneAuth";
import { toast } from "sonner";


type Props = { phone: string | null; onVerified?: (phone: string) => void };

/** 1. güven yıldızı: telefon numarasını SMS kodu ile doğrular. */
const PhoneVerifyRow = ({ phone, onVerified }: Props) => {
  const t = useT();
  const verified = !!phone;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const fullPhone = `+90${input}`;

  const sendCode = async () => {
    if (input.length !== 10) {
      toast.error(t("Telefon numaranı 10 hane olarak yaz (5XX XXX XX XX)."));
      return;
    }
    setBusy(true);
    const res = await sendPhoneCode(fullPhone);
    setBusy(false);
    if (!res.ok) {
      if (res.reason === "invalid_phone") toast.error(t("Numaran geçersiz görünüyor. Kontrol et."));
      else if (res.reason === "too_many_requests")
        toast.error(t("Çok fazla deneme yaptın. Biraz sonra tekrar dene."));
      else if (res.reason === "not_configured")
        toast.error(t("Telefon doğrulama şu an kullanılamıyor."));
      else toast.error(t("SMS gönderilemedi. Numaranı kontrol et."));
      return;
    }
    setSent(true);
    toast.success(t("Doğrulama kodu telefonuna gönderildi."));
  };

  const confirm = async () => {
    if (code.length !== 6) {
      toast.error(t("6 haneli kodu gir."));
      return;
    }
    setBusy(true);
    const res = await confirmPhoneCode(code);
    setBusy(false);
    if (!res.ok || !res.phone) {
      if (res.reason === "phone_taken") toast.error(t("Bu numara başka bir hesapta kayıtlı."));
      else if (res.reason === "invalid_code") toast.error(t("Kod hatalı veya süresi dolmuş."));
      else toast.error(t("Doğrulama yapılamadı. Tekrar dene."));
      return;
    }
    toast.success(t("Telefon numaran doğrulandı."));
    setOpen(false);
    setSent(false);
    setCode("");
    onVerified?.(res.phone);
  };

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div>
            <p className="text-xs font-bold text-foreground">{t("Telefon Doğrulama")}</p>
            <p className="text-[10px] text-muted-foreground">{verified ? phone : t("SMS kodu ile doğrula")}</p>
          </div>
        </div>
        {verified ? (
          <span className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-bold text-primary">
            <Check size={11} /> {t("Onaylandı")}
          </span>
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary"
          >
            {open ? t("Vazgeç") : t("Doğrula")}
          </button>
        )}
      </div>

      {!verified && open && (
        <div className="mt-3 space-y-2">
          {!sent ? (
            <>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-sm font-bold text-foreground">
                  +90
                </span>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  inputMode="numeric"
                  placeholder="5XX XXX XX XX"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <button
                onClick={sendCode}
                disabled={busy}
                className="gradient-warm flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {t("Kod Gönder")}
              </button>
            </>
          ) : (
            <>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder={t("6 haneli kod")}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center text-lg font-black tracking-[0.4em] text-foreground outline-none focus:border-primary"
              />
              <button
                onClick={confirm}
                disabled={busy}
                className="gradient-warm flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                {t("Onayla")}
              </button>
              <button
                onClick={() => {
                  resetPhoneFlow();
                  setSent(false);
                  setCode("");
                }}
                className="w-full py-1 text-[11px] font-bold text-muted-foreground"
              >
                {t("Numarayı değiştir")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default PhoneVerifyRow;
