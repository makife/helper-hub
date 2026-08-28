import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Navigation, MessageCircle, Send, MapPin, User, Clock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import RouteMap from "@/components/RouteMap";
import type { Tables } from "@/integrations/supabase/types";
import { getTaskEmoji } from "@/lib/taskCategories";
import { confirmCompletion, confirmDeadlineMs, formatRemaining, requestCompletion, rejectCompletion, markArrival, completionUnlockMs, taskStatusLabels } from "@/lib/taskLifecycle";

type TaskerEntry = { tasker_id: string; profile: Tables<"profiles"> | null };

const ActiveTask = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [task, setTask] = useState<Tables<"tasks"> | null>(null);
  const [taskers, setTaskers] = useState<TaskerEntry[]>([]);
  const [myArrivedAt, setMyArrivedAt] = useState<string | null>(null);
  const [arriving, setArriving] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [ownerProfile, setOwnerProfile] = useState<Tables<"profiles"> | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Tables<"messages">[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isOwner = !!user && task?.owner_id === user.id;
  const otherProfile = isOwner
    ? taskers.find((t) => t.tasker_id === partnerId)?.profile ?? null
    : ownerProfile;

  useEffect(() => {
    if (!taskId || !user) return;

    const fetchTask = async () => {
      const { data } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
      if (!data) { navigate("/home"); return; }
      setTask(data);

      const { data: owner } = await supabase
        .from("profiles").select("*").eq("user_id", data.owner_id).maybeSingle();
      setOwnerProfile(owner);

      const { data: assignments } = await supabase
        .from("task_assignments")
        .select("tasker_id")
        .eq("task_id", taskId)
        .eq("status", "accepted")
        .order("created_at", { ascending: true });

      const ids = (assignments || []).map((a) => a.tasker_id);
      let profiles: Tables<"profiles">[] = [];
      if (ids.length > 0) {
        const { data: p } = await supabase.from("profiles").select("*").in("user_id", ids);
        profiles = p || [];
      }
      const entries = ids.map((id) => ({
        tasker_id: id,
        profile: profiles.find((p) => p.user_id === id) || null,
      }));
      setTaskers(entries);

      if (data.owner_id === user.id) {
        setPartnerId((prev) => prev ?? entries[0]?.tasker_id ?? null);
      } else {
        setPartnerId(data.owner_id);
      }
    };

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });
      setMessages(data || []);

      // Mark as read
      if (data && data.length > 0) {
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("task_id", taskId)
          .eq("receiver_id", user.id)
          .eq("is_read", false);
      }
    };

    fetchTask();
    fetchMessages();

    // Get user location
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );

    // Realtime messages
    const channel = supabase
      .channel(`task-chat-${taskId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `task_id=eq.${taskId}`,
      }, (payload) => {
        const msg = payload.new as Tables<"messages">;
        setMessages((prev) => [...prev, msg]);
        if (msg.receiver_id === user.id) {
          supabase.from("messages").update({ is_read: true }).eq("id", msg.id).then(() => {});
        }
      })
      .subscribe();

    const assignmentChannel = supabase
      .channel(`task-assignments-page-${taskId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "task_assignments", filter: `task_id=eq.${taskId}`,
      }, () => fetchTask())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(assignmentChannel);
    };
  }, [taskId, user]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !task) return;
    const receiverId = partnerId;
    if (!receiverId) { toast.error("Henüz konuşulacak kişi yok."); return; }


    setSending(true);
    const { error } = await supabase.from("messages").insert({
      task_id: task.id,
      sender_id: user.id,
      receiver_id: receiverId,
      content: newMessage.trim(),
    });
    setSending(false);
    if (error) { toast.error("Mesaj gönderilemedi"); return; }
    setNewMessage("");
  };

  const handleStartRoute = () => {
    setShowRoute(true);
  };

  if (!task) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (showRoute) {
    return (
      <RouteMap
        taskLat={task.latitude}
        taskLng={task.longitude}
        taskTitle={task.title}
        onClose={() => setShowRoute(false)}
      />
    );
  }

  const isTasker = !isOwner;
  const needed = task.person_count ?? 1;
  const visibleMessages = messages.filter(
    (m) =>
      !partnerId ||
      (m.sender_id === user?.id && m.receiver_id === partnerId) ||
      (m.sender_id === partnerId && m.receiver_id === user?.id)
  );


  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-5 pb-3 pt-4">
        <button onClick={() => navigate("/home")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-black text-foreground">{task.title}</h1>
          <p className="text-xs text-muted-foreground">
            {taskStatusLabels[task.status]?.label || task.status}
            {needed > 1 && ` · 👥 ${taskers.length}/${needed} kişi`}
          </p>
        </div>
        <span className="text-lg font-black text-primary">{task.current_price || task.price} ₺</span>
      </div>

      {/* Task & Location Info */}
      <div className="border-b border-border px-5 py-3 space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg">
            {getTaskEmoji(task.category, task.subcategory, task.title)}
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{task.description}</p>
          </div>
        </div>

        {/* Owner: birden fazla tasker varsa sohbet seçici */}
        {isOwner && taskers.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {taskers.map((t) => (
              <button
                key={t.tasker_id}
                onClick={() => setPartnerId(t.tasker_id)}
                className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                  partnerId === t.tasker_id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {t.profile?.full_name || "Tasker"}
              </button>
            ))}
          </div>
        )}

        {isOwner && taskers.length === 0 && (
          <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
            Henüz kimse bu işi kabul etmedi. Kabul eden olduğunda burada sohbet açılacak.
          </p>
        )}

        {/* Other user profile */}
        {otherProfile && (

          <button
            onClick={() => navigate(`/profile/${otherProfile.user_id}`)}
            className="flex w-full items-center gap-3 rounded-xl bg-muted/50 p-3 text-left active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              {otherProfile.avatar_url ? (
                <img src={otherProfile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={18} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{otherProfile.full_name}</p>
              <p className="text-xs text-muted-foreground">
                {isTasker ? "İş Veren" : "Tasker"} · ⭐ {otherProfile.rating || "0.0"}
              </p>
            </div>
            <span className="text-xs text-primary font-semibold">Profil →</span>
          </button>
        )}

        {/* Location info */}
        <div className="flex gap-2">
          {userLocation && (
            <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary/5 px-3 py-2">
              <MapPin size={14} className="text-primary" />
              <div>
                <p className="text-[10px] text-muted-foreground">Senin Konumun</p>
                <p className="text-xs font-bold text-foreground">{userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</p>
              </div>
            </div>
          )}
          <div className="flex flex-1 items-center gap-2 rounded-xl bg-accent/30 px-3 py-2">
            <MapPin size={14} className="text-destructive" />
            <div>
              <p className="text-[10px] text-muted-foreground">İş Konumu</p>
              <p className="text-xs font-bold text-foreground">{task.latitude.toFixed(4)}, {task.longitude.toFixed(4)}</p>
            </div>
          </div>
        </div>

        {/* Completion actions */}
        {task.status === "pending_confirm" && isOwner && (
          <button
            onClick={async () => {
              const ok = await confirmCompletion(task.id);
              if (ok) {
                setTask((current) => current ? { ...current, status: "completed", completed_at: new Date().toISOString() } : current);
                toast.success("Yardım çağrısı tamamlandı.");
              } else toast.error("İş tamamlanamadı, tekrar dene.");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 font-bold text-primary-foreground shadow-soft"
          >
            <CheckCircle2 size={18} /> İşi Onayla ve Tamamla
          </button>
        )}
        {task.status !== "completed" && task.status !== "cancelled" && task.status !== "expired" && isTasker && task.status !== "pending_confirm" && (
          <button
            onClick={async () => {
              if (!user) return;
              const ok = await requestCompletion(task.id, user.id);
              if (ok) {
                setTask((current) => current ? { ...current, status: "pending_confirm", completion_requested_at: new Date().toISOString(), completion_requested_by: user.id } : current);
                toast.success("İş verene onay isteği gönderildi.");
              } else toast.error("İş tamamlanma isteği gönderilemedi.");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 font-bold text-accent-foreground"
          >
            <CheckCircle2 size={18} /> İşi Bitirdim
          </button>
        )}
        {task.status === "pending_confirm" && isTasker && (
          <p className="rounded-2xl bg-muted px-4 py-3 text-center text-xs font-semibold text-muted-foreground">
            Onay bekleniyor · {formatRemaining(confirmDeadlineMs(task.completion_requested_at))}
          </p>
        )}

        {/* Route button */}
        <button
          onClick={handleStartRoute}
          className="gradient-warm flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-bold text-primary-foreground shadow-soft active:scale-[0.98]"
        >
          <Navigation size={18} />
          Rota Oluştur
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
        {visibleMessages.length === 0 && (
          <div className="flex flex-col items-center py-10">
            <MessageCircle size={32} className="text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Henüz mesaj yok. İlk mesajı gönder!</p>
          </div>
        )}
        {visibleMessages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {new Date(msg.created_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border bg-card px-4 py-3 safe-bottom">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Mesaj yaz..."
            className="flex-1 rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <button
            onClick={handleSend}
            disabled={sending || !newMessage.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50 active:scale-95"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveTask;
