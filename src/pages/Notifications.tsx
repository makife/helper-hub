import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, MessageCircle, UserCheck, UserMinus, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/dateFormat";

type Notif = {
  id: string;
  type: "message" | "assignment_accepted" | "assignment_left";
  title: string;
  body: string;
  at: string;
  taskId: string | null;
  unread: boolean;
};

const dateLabel = (date: string) => formatDateTime(date);

const localizeNotificationText = (text: string, t: (value: string) => string) => {
  const suffixes: Array<[string, string]> = [
    [" çağrını kabul etti", "çağrını kabul etti"],
    [" işi bıraktı", "işi bıraktı"],
  ];
  for (const [sourceSuffix, keySuffix] of suffixes) {
    if (text.endsWith(sourceSuffix)) {
      return `${text.slice(0, -sourceSuffix.length)} ${t(keySuffix)}`;
    }
  }

  return text
    .replace("İş bitti olarak işaretlendi", t("İş bitti olarak işaretlendi"))
    .replace("Yardım çağrının süresi doldu", t("Yardım çağrının süresi doldu"))
    .replace("Anlaşmazlık lehine sonuçlandı", t("Anlaşmazlık lehine sonuçlandı"))
    .replace("Anlaşmazlık aleyhine sonuçlandı", t("Anlaşmazlık aleyhine sonuçlandı"))
    .replace("İtiraz yapıldı", t("İtiraz yapıldı"))
    .replace("İtirazın iletildi", t("İtirazın iletildi"));
};

const Notifications = () => {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const list: Notif[] = [];

      // 1) Kalıcı bildirimler (iş kabul / iş bırakma)
      const { data: notifs } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      for (const n of notifs ?? []) {
        list.push({
          id: `n-${n.id}`,
          type: n.type === "assignment_left" ? "assignment_left" : "assignment_accepted",
          title: localizeNotificationText(n.title, t),
          body: localizeNotificationText(n.body ?? "", t),
          at: n.created_at,
          taskId: n.task_id,
          unread: !n.is_read,
        });
      }

      // 2) Gelen mesajlar
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, content, created_at, is_read, task_id, sender_id")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false });

      const senderIds = [...new Set((msgs ?? []).map((m) => m.sender_id))];
      const { data: profiles } = senderIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", senderIds)
        : { data: [] as { user_id: string; full_name: string }[] };
      const names = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

      for (const m of msgs ?? []) {
        list.push({
          id: `m-${m.id}`,
          type: "message",
          title: `${names.get(m.sender_id) || t("Kullanıcı")} ${t("mesaj gönderdi")}`,
          body: m.content,
          at: m.created_at,
          taskId: m.task_id,
          unread: !m.is_read,
        });
      }

      list.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
      setItems(list);
      setLoading(false);

      // Bildirimleri okundu olarak işaretle
      const unreadIds = (notifs ?? []).filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length > 0) {
        await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
      }
    };

    load();

    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, t]);

  const iconFor = (t: Notif["type"]) => {
    if (t === "message") return <MessageCircle size={18} className="text-primary" />;
    if (t === "assignment_left") return <UserMinus size={18} className="text-destructive" />;
    return <UserCheck size={18} className="text-primary" />;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">{t("Bildirimler")}</h1>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-5">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Bell size={32} className="text-muted-foreground" />
            </div>
            <p className="text-lg font-bold text-foreground">{t("Henüz bildirim yok")}</p>
            <p className="text-center text-sm text-muted-foreground">
              {t("Çağrına başvuru geldiğinde, biri işi bıraktığında ve yeni mesaj aldığında burada görünecek.")}
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 space-y-2 px-5 pb-24">
          {items.map((n, i) => (
            <motion.button
              key={n.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              onClick={() => navigate(n.type === "message" ? "/messages" : n.taskId ? `/task/${n.taskId}` : "/my-tasks")}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left shadow-card transition-shadow active:scale-[0.98] ${
                n.unread ? "border-primary/40 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">{iconFor(n.type)}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{n.title}</p>
                <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                  <Calendar size={10} />
                  {dateLabel(n.at)}
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
