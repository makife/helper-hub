import { useEffect, useState } from "react";
import { Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";

/** Hesabı askıya alınmış kullanıcılara tam ekran bilgilendirme gösterir. */
const SuspensionGate = () => {
  const { user, signOut } = useAuth();
  const t = useT();
  const [until, setUntil] = useState<string | null>(null);
  const [banned, setBanned] = useState(false);

  useEffect(() => {
    if (!user) { setBanned(false); return; }
    let active = true;
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_banned, suspended_until")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active || !data) return;
      setBanned(!!data.is_banned);
      setUntil(data.suspended_until ?? null);
    };
    void load();
    const channel = supabase
      .channel(`suspension-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, () => void load())
      .subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, [user]);

  if (!banned) return null;

  const untilLabel = until ? new Date(until).toLocaleDateString() : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background px-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <Ban size={30} />
      </div>
      <h1 className="text-lg font-extrabold">{t("Hesabın askıya alındı")}</h1>
      <p className="text-sm text-muted-foreground">
        {untilLabel
          ? t("Kabul ettiğin bir işin randevusuna gitmediğin için hesabın {date} tarihine kadar askıda.", { date: untilLabel })
          : t("Hesabın yönetici tarafından askıya alındı.")}
      </p>
      <button onClick={() => void signOut()} className="rounded-2xl border px-5 py-2.5 text-sm font-bold">
        {t("Çıkış Yap")}
      </button>
    </div>
  );
};

export default SuspensionGate;
