import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const OTP_LENGTH = 6;

const OTPVerify = () => {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [providerIssue, setProviderIssue] = useState<string | null>(null);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { phone?: string; fullPhone?: string } | null;
  const phone = state?.phone || "5XXXXXXXXX";
  const fullPhone = state?.fullPhone || `+90${phone}`;

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer <= 0) return;
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const verifyOtp = async (code: string) => {
    setLoading(true);
    setProviderIssue(null);

    try {
      const response = await supabase.functions.invoke("verify-otp", {
        body: { phone: fullPhone, code },
      });

      setLoading(false);

      if (response.error || response.data?.error) {
        toast.error(response.data?.error || "Kod hatalı. Lütfen tekrar deneyin.");
        setOtp(Array(OTP_LENGTH).fill(""));
        inputsRef.current[0]?.focus();
        return;
      }

      const { session, needsProfile } = response.data;

      // Set session in Supabase client
      if (session) {
        await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
      }

      toast.success("Giriş başarılı!");

      if (needsProfile) {
        navigate("/role-select");
      } else {
        navigate("/home");
      }
    } catch (err) {
      setLoading(false);
      toast.error("Doğrulama başarısız. Lütfen tekrar deneyin.");
      console.error("Verify error:", err);
      setOtp(Array(OTP_LENGTH).fill(""));
      inputsRef.current[0]?.focus();
    }
  };

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);

    if (value && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== "")) {
      setTimeout(() => verifyOtp(newOtp.join("")), 200);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const resendOtp = async () => {
    setProviderIssue(null);
    try {
      const response = await supabase.functions.invoke("send-otp", {
        body: { phone: fullPhone },
      });

      if (response.error || response.data?.error) {
        toast.error(response.data?.error || "Kod gönderilemedi.");
        return;
      }

      toast.success("Yeni kod gönderildi!");
      setTimer(60);
    } catch (err) {
      toast.error("Kod gönderilemedi.");
      console.error("Resend error:", err);
    }
  };

  const maskedPhone = `+90 ${phone.slice(0, 3)} *** ** ${phone.slice(-2)}`;

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12 safe-top safe-bottom">
      <motion.button
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-sm font-semibold text-muted-foreground"
      >
        <ArrowLeft size={20} />
        Geri
      </motion.button>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <h1 className="mb-2 text-3xl font-black text-foreground">Doğrulama Kodu</h1>
        <p className="mb-8 text-base text-muted-foreground">
          <span className="font-bold text-foreground">{maskedPhone}</span> numarasına gönderilen 6 haneli kodu gir.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-6 flex justify-center gap-3"
      >
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className={`h-14 w-12 rounded-xl border-2 bg-card text-center text-2xl font-black text-foreground outline-none transition-colors ${
              digit ? "border-primary" : "border-border"
            } focus:border-primary`}
          />
        ))}
      </motion.div>

      {providerIssue && (
        <div className="mb-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <div className="mb-1 flex items-start gap-2">
            <AlertTriangle size={18} className="mt-0.5 text-destructive" />
            <div>
              <p className="text-sm font-bold text-foreground">Telefon OTP kapalı</p>
              <p className="text-sm text-muted-foreground">{providerIssue}</p>
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-auto text-center"
      >
        {timer > 0 ? (
          <p className="text-sm text-muted-foreground">
            Tekrar gönder <span className="font-bold text-foreground">{timer}s</span>
          </p>
        ) : (
          <button onClick={resendOtp} className="text-sm font-bold text-primary">
            Kodu tekrar gönder
          </button>
        )}
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => verifyOtp(otp.join(""))}
        disabled={otp.some((d) => d === "") || loading}
        className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {loading ? "Doğrulanıyor..." : "Doğrula"}
      </motion.button>
    </div>
  );
};

export default OTPVerify;
