import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const PhoneLogin = () => {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [providerIssue, setProviderIssue] = useState<string | null>(null);
  const navigate = useNavigate();

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
    if (providerIssue) setProviderIssue(null);
  };

  const rawDigits = phone.replace(/\s/g, "");
  const isValid = rawDigits.length === 10;

  const handleSubmit = async () => {
    if (!isValid) return;
    setLoading(true);
    setProviderIssue(null);

    const fullPhone = `+90${rawDigits}`;

    try {
      const response = await supabase.functions.invoke("send-otp", {
        body: { phone: fullPhone },
      });

      setLoading(false);

      if (response.error || response.data?.error) {
        const msg = response.data?.error || "SMS gönderilemedi.";
        toast.error(msg);
        console.error("OTP error:", msg);
        return;
      }

      toast.success("Doğrulama kodu gönderildi!");
      navigate("/otp", { state: { phone: rawDigits, fullPhone } });
    } catch (err) {
      setLoading(false);
      toast.error("SMS gönderilemedi. Lütfen tekrar deneyin.");
      console.error("OTP error:", err);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12 safe-top safe-bottom">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 flex items-center gap-3"
      >
        <img src={logo} alt="Bi' El At" width={40} height={40} />
        <span className="text-xl font-black text-foreground">Bi' El At</span>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="mb-2 text-3xl font-black text-foreground">Giriş Yap</h1>
        <p className="mb-8 text-base text-muted-foreground">
          Telefon numaranı gir, sana bir doğrulama kodu gönderelim.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1"
      >
        <label className="mb-2 block text-sm font-semibold text-foreground">
          Telefon Numarası
        </label>
        <div className="flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-4 transition-colors focus-within:border-primary">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone size={20} />
            <span className="text-base font-bold">+90</span>
          </div>
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="5XX XXX XXXX"
            className="flex-1 bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/50"
          />
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          SMS ile 6 haneli bir doğrulama kodu göndereceğiz.
        </p>

        {providerIssue && (
          <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
            <div className="mb-1 flex items-start gap-2">
              <AlertTriangle size={18} className="mt-0.5 text-destructive" />
              <div>
                <p className="text-sm font-bold text-foreground">Telefon OTP kapalı</p>
                <p className="text-sm text-muted-foreground">{providerIssue}</p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
      >
        {loading ? "Gönderiliyor..." : "Kod Gönder"}
      </motion.button>
    </div>
  );
};

export default PhoneLogin;
