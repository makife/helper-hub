import { useEffect, useState } from "react";
import { Bell, MessageCircle, Briefcase, Tag } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Prefs = {
  notify_messages: boolean;
  notify_task_updates: boolean;
  notify_offers: boolean;
};

const ITEMS: { key: keyof Prefs; icon: typeof Bell; title: string; desc: string }[] = [
  { key: "notify_messages", icon: MessageCircle, title: "Mesajlar", desc: "Yeni sohbet mesajı bildirimleri" },
  { key: "notify_task_updates", icon: Briefcase, title: "İş Güncellemeleri", desc: "Kabul, varış, tamamlama ve iptal bildirimleri" },
  { key: "notify_offers", icon: Tag, title: "Fiyat Teklifleri", desc: "Gelen ve yanıtlanan teklif bildirimleri" },
];

/** Bildirim tercihleri ayar kartı */
const NotificationPrefs = () => {
  const t = useT();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>({
    notify_messages: true,
    notify_task_updates: true,
    notify_offers: true,
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("notify_messages, notify_task_updates, notify_offers")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setPrefs(data as Prefs);
      });
  }, [user]);

  const toggle = async (key: keyof Prefs) => {
    if (!user) return;
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    const { error } = await supabase.from("profiles").update({ [key]: next[key] }).eq("user_id", user.id);
    if (error) {
      setPrefs(prefs);
      toast.error(t("Bildirim tercihi kaydedilemedi."));
    }
  };

  return (
    <div className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center gap-2">
        <Bell size={16} className="text-primary" />
        <p className="text-sm font-black text-foreground">{t("Bildirim Tercihleri")}</p>
      </div>
      <div className="space-y-3">
        {ITEMS.map(({ key, icon: Icon, title, desc }) => (
          <div key={key} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{t(title)}</p>
                <p className="text-[11px] text-muted-foreground">{t(desc)}</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[key]}
              aria-label={t(title)}
              onClick={() => toggle(key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${prefs[key] ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${prefs[key] ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationPrefs;
