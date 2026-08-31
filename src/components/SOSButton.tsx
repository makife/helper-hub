import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Phone, MessageSquareWarning, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Props = {
  taskId?: string;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
};

// İş sırasında ekranda sabit duran, basınca onay isteyen SOS butonu.
// Basılınca: konum + iş id'si sos_alerts tablosuna kaydedilir, ardından
// kullanıcının profilinde kayıtlı acil durum kişisine tel: linkiyle arama
// başlatılır (native dialer açılır). Acil durum kişisi tanımlı değilse
// önce onu ayarlamaya yönlendirilir.
const SOSButton = ({ taskId, emergencyContactName, emergencyContactPhone }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const handleConfirm = async () => {
    if (!user) return;
    setSending(true);

    let latitude: number | null = null;
    let longitude: number | null = null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
    } catch {
      // Konum alınamazsa da SOS kaydı yine de oluşturulsun
    }

    await supabase.from("sos_alerts").insert({
      user_id: user.id,
      task_id: taskId ?? null,
      latitude,
      longitude,
    });

    setSending(false);
    setOpen(false);

    if (!emergencyContactPhone) {
      toast.error("Acil durum kişin tanımlı değil. Profilinden ekleyebilirsin.");
      return;
    }

    const mapsLink = latitude && longitude ? `https://maps.google.com/?q=${latitude},${longitude}` : "";
    if (mapsLink) {
      // SMS ile konumu paylaşmayı dene, sonra ara
      window.location.href = `sms:${emergencyContactPhone}?body=${encodeURIComponent(
        `Acil durum! Konumum: ${mapsLink}`
      )}`;
      setTimeout(() => {
        window.location.href = `tel:${emergencyContactPhone}`;
      }, 800);
    } else {
      window.location.href = `tel:${emergencyContactPhone}`;
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Acil Durum"
        className="fixed bottom-24 right-4 z-[900] flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xl active:scale-90"
      >
        <ShieldAlert size={26} />
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/60 p-4">
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-base font-black text-destructive">
                  <MessageSquareWarning size={22} />
                  Acil Durum
                </span>
                <button onClick={() => setOpen(false)}>
                  <X size={20} className="text-muted-foreground" />
                </button>
              </div>
              <p className="mb-4 text-sm text-muted-foreground">
                {emergencyContactPhone
                  ? `Konumun ${emergencyContactName || "acil durum kişin"}e SMS ile gönderilecek ve arama başlatılacak. Emin misin?`
                  : "Acil durum kişin tanımlı değil. Yine de bu SOS'u kaydetmek ister misin?"}
              </p>
              <button
                onClick={handleConfirm}
                disabled={sending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive py-3.5 font-bold text-destructive-foreground active:scale-[0.98] disabled:opacity-60"
              >
                <Phone size={18} />
                {sending ? "Gönderiliyor..." : "Evet, Acil Durum Bildir"}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SOSButton;
