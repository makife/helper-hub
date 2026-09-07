import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateTime } from "@/lib/dateFormat";
import { getCache, setCache } from "@/lib/uiCache";
import { uniqueChannel } from "@/lib/realtime";

type Conversation = {
  task_id: string;
  task_title: string;
  task_status: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
};

const Messages = () => {
  const t = useT();
  const cached = getCache<Conversation[]>("conversations");
  const [conversations, setConversations] = useState<Conversation[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data: messages } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(300);

      if (!messages || messages.length === 0) {
        setConversations([]);
        setCache("conversations", [] as Conversation[]);
        setLoading(false);
        return;
      }

      // Group by task_id first, then resolve related records in two batch queries.
      const taskMap = new Map<string, typeof messages>();
      for (const msg of messages) {
        if (!taskMap.has(msg.task_id)) taskMap.set(msg.task_id, []);
        taskMap.get(msg.task_id)!.push(msg);
      }

      const taskIds = [...taskMap.keys()];
      const otherIds = [...new Set([...taskMap.values()].map((msgs) => {
        const last = msgs[0];
        return last.sender_id === user.id ? last.receiver_id : last.sender_id;
      }))];
      const [{ data: profiles }, { data: tasks }] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", otherIds),
        supabase.from("tasks").select("id, title, status").in("id", taskIds),
      ]);
      const profileById = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
      const taskById = new Map((tasks ?? []).map((task) => [task.id, task]));

      const convos: Conversation[] = [];
      for (const [taskId, msgs] of taskMap) {
        const lastMsg = msgs[0];
        const otherId = lastMsg.sender_id === user.id ? lastMsg.receiver_id : lastMsg.sender_id;
        const profile = profileById.get(otherId);
        convos.push({
          task_id: taskId,
          task_title: taskById.get(taskId)?.title || t("İş"),
          task_status: taskById.get(taskId)?.status || "open",
          other_user_id: otherId,
          other_user_name: profile?.full_name || t("Kullanıcı"),
          other_user_avatar: profile?.avatar_url || null,
          last_message: lastMsg.content,
          last_message_at: lastMsg.created_at,
          unread_count: msgs.filter((m) => m.receiver_id === user.id && !m.is_read).length,
        });
      }

      setConversations(convos);
      setCache("conversations", convos);
      setLoading(false);
    };

    fetchConversations();

    // Realtime: sadece bu kullanıcıyı ilgilendiren mesajlarda yenile
    const channel = supabase
      .channel(uniqueChannel(`messages-list-${user.id}`))
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => { fetchConversations(); },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        () => { fetchConversations(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const dateLabel = (date: string) => formatDateTime(date);

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">{t("Mesajlar")}</h1>
      </div>

      <div className="flex-1 px-5 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <MessageCircle size={32} className="text-muted-foreground" />
            </div>
            <p className="mt-3 text-lg font-bold text-foreground">{t("Henüz mesaj yok")}</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              {t("Bir iş kabul ettiğinizde mesajlaşma başlayacak.")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv, i) => {
              const closed = !["matched", "in_progress", "pending_confirm"].includes(conv.task_status);
              return (
              <motion.button
                key={conv.task_id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: closed ? 0.55 : 1 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate(`/task/${conv.task_id}`)}
                className={`flex w-full items-center gap-3 rounded-2xl border border-border p-4 text-left shadow-card transition-shadow active:scale-[0.98] ${closed ? "bg-muted/40 grayscale" : "bg-card"}`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  {conv.other_user_avatar ? (
                    <img src={conv.other_user_avatar} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-muted-foreground">
                      {conv.other_user_name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="truncate text-sm font-bold text-foreground">{conv.other_user_name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{conv.task_title}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                  <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Calendar size={10} />
                    {dateLabel(conv.last_message_at)}
                  </span>
                </div>
                {conv.unread_count > 0 && (
                  <div className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5">
                    <span className="text-[10px] font-bold text-primary-foreground">{conv.unread_count}</span>
                  </div>
                )}
              </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
