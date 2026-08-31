import { useEffect, useState } from "react";
import { Gift, Share2, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Profil sayfasına gömülecek "Arkadaşını Davet Et" kartı. Kullanıcının
// referral_code'unu gösterir, paylaşma/kopyalama sağlar. Ödül mantığı
// (referred_by kaydı + kredi verilmesi) migration'daki trigger'da.
const ReferralCard = () => {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("referral_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setCode(data?.referral_code ?? null));
  }, [user]);

  if (!code) return null;

  const shareText = `Bi' El At'ta yardım çağrısı açıp hızlıca el atacak birini buluyorum. Sen de dene, ${code} kodumla kaydolursan ikimize de kredi hediye: https://bielat.app/davet/${code}`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
      } catch {
        // kullanıcı paylaşımı iptal etti, sorun değil
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast.success("Davet metni kopyalandı!");
    }
  };

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Kod kopyalandı!");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
        <Gift size={18} className="text-primary" />
        Arkadaşını Davet Et
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Kodunla kaydolan arkadaşın ilk işini tamamlayınca ikinize de 1'er kredi hediye.
      </p>

      <button
        onClick={handleCopyCode}
        className="mb-2 flex w-full items-center justify-between rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3"
      >
        <span className="text-lg font-black tracking-widest text-primary">{code}</span>
        {copied ? <Check size={18} className="text-primary" /> : <Copy size={18} className="text-primary" />}
      </button>

      <button
        onClick={handleShare}
        className="flex w-full items-center justify-center gap-2 rounded-xl gradient-warm py-3 text-sm font-bold text-primary-foreground shadow-soft active:scale-95"
      >
        <Share2 size={16} />
        Davet Linkini Paylaş
      </button>
    </div>
  );
};

export default ReferralCard;
