import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Profil sayfasına gömülebilen "Şu an müsaitim" anahtarı.
// Açıkken hem haritada (varsa) hem de acil iş push bildirimlerinde
// önceliklendirme için kullanılabilir.
const AvailabilityToggle = () => {
  const { user } = useAuth();
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("is_available")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setAvailable(Boolean(data?.is_available));
        setLoading(false);
      });
  }, [user]);

  const toggle = async () => {
    if (!user) return;
    const next = !available;
    setAvailable(next);
    const { error } = await supabase.from("profiles").update({ is_available: next }).eq("user_id", user.id);
    if (error) {
      setAvailable(!next);
      toast.error("Güncellenemedi, tekrar dene.");
      return;
    }
    toast.success(next ? "Artık müsait görünüyorsun!" : "Müsait değil olarak işaretlendin.");
  };

  if (loading) return null;

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4"
    >
      <div className="flex items-center gap-3 text-left">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-full ${
            available ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          <Zap size={18} />
        </span>
        <div>
          <p className="text-sm font-bold text-foreground">Şu An Müsaitim</p>
          <p className="text-xs text-muted-foreground">
            {available ? "İş aramaya aktif olarak açıksın" : "Yeni iş bildirimlerinde öncelikli değilsin"}
          </p>
        </div>
      </div>
      <span
        className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${
          available ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            available ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </span>
    </button>
  );
};

export default AvailabilityToggle;
