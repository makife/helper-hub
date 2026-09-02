import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  clearPendingReferralCode,
} from "@/lib/nativeAuth";
import logo from "@/assets/logo.png";

const PENDING_REFERRAL_KEY = "bielat_pending_referral_code";

/**
 * Web üzerinden paylaşılan davet linkinin açıldığı sayfa.
 * Örn: https://task-hand-shake.lovable.app/davet/ABC123
 * Kodu localStorage'a kaydeder ve kullanıcıyı login/profile-setup'a yönlendirir.
 */
const InviteLanding = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    const normalized = code?.trim().toUpperCase();
    if (normalized) {
      localStorage.setItem(PENDING_REFERRAL_KEY, normalized);
    } else {
      clearPendingReferralCode();
    }

    if (loading) return;

    if (user) {
      navigate("/profile-setup", { replace: true });
    } else {
      navigate("/login", { replace: true });
    }
  }, [code, user, loading, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <img src={logo} alt="Bi' El At" width={72} height={72} />
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("Davet kodu yükleniyor")}</h1>
        <p className="mt-2 text-base text-muted-foreground">
          {code ? `Kod: ${code.toUpperCase()}` : "Yönlendiriliyorsunuz..."}
        </p>
      </div>
    </div>
  );
};

export default InviteLanding;
