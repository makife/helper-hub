import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, MessageCircle, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Notif = {
  id: string;
  type: "message" | "assignment";
  title: string;
  body: string;
  at: string;
  taskId: string;
  unread: boolean;
};

const timeAgo = (date: string) => {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "şimdi";
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa`;
  return `${Math.floor(hours / 24)} gün`;
};

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      const list: Notif[] = [];

      // 1) Gelen mesajlar
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, content, created_at, is_read, task_id, sender_id")
        .eq("receiver_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      // 2) Kendi çağrılarıma gelen başvurular
      const { data: myTasks } = await supabase
        .from("tasks")
        .select("id, title")
        .eq("owner_id", user.id);

      const taskTitles = new Map((myTasks ?? []).map((t) => [t.id, t.title]));

      let assigns: { id: string; task_id: string; tasker_id: string; created_at: string }[] = [];
      if (myTasks && myTasks.length > 0) {
        const { data } = await supabase
          .from("task_assignments")
          .select("id, task_id, tasker_id, created_at")
          .in("task_id", myTasks.map((t) => t.id))
          .order("created_at", { ascending: false })
          .limit(30);
        assigns = data ?? [];
      }

      const userIds = [
        ...new Set([...(msgs ?? []).map((m) => m.sender_id), ...assigns.map((a) => a.tasker_id)]),
      ];
      const { data: profiles } = userIds.length
        ? await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds)
        : { data: [] as { user_id: string; full_name: string }[] };
      const names = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));

      for (const m of msgs ?? []) {
        list.push({
          id: `m-${m.id}`,
          type: "message",
          title: `${names.get(m.sender_id) || "Kullanıcı"} mesaj gönderdi`,
          body: m.content,
          at: m.created_at,
          taskId: m.task_id,
          unread: !m.is_read,
        });
      }

      for (const a of assigns) {
        list.push({
          id: `a-${a.id}`,
          type: "assignment",
          title: `${names.get(a.tasker_id) || "Bir kullanıcı"} çağrını kabul etti`,
          body: taskTitles.get(a.task_id) || "Yardım çağrısı",
          at: a.created_at,
          taskId: a.task_id,
          unread: false,
        });
      }

      list.sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
      setItems(list);
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel("notifications-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">Bildirimler</h1>
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
            <p className="text-lg font-bold text-foreground">Henüz bildirim yok</p>
            <p className="text-center text-sm text-muted-foreground">
              Çağrına başvuru geldiğinde ve yeni mesaj aldığında burada görünecek.
            </p>
          </motion.div>
        </div>
      ) : (
        <div className="flex-1 space-y-2 px-5 pb-24">
          {items.map((n) => (
            <button
              key={n.id}
              onClick={() => navigate(n.type === "message" ? "/messages" : `/task/${n.taskId}`)}
              className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left shadow-card ${
                n.unread ? "border-primary/40 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                {n.type === "message" ? (
                  <MessageCircle size={18} className="text-primary" />
                ) : (
                  <UserCheck size={18} className="text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-foreground">{n.title}</p>
                <p className="truncate text-xs text-muted-foreground">{n.body}</p>
              </div>
              <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{timeAgo(n.at)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
