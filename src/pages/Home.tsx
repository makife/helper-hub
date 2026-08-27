import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Zap, MapPin, Bell } from "lucide-react";
import TaskMap from "@/components/TaskMap";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/contexts/RoleContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const categoryEmoji: Record<string, string> = {
  ampul_takma: "💡",
  perde_asma: "🪟",
  mobilya_monte: "🪑",
  duvar_tamir: "🔨",
  kucuk_tamir: "🔧",
  tasima_yardimi: "📦",
};

type TaskWithUI = Tables<"tasks"> & {
  emoji: string;
  lat: number;
  lng: number;
};

const Home = () => {
  const [tasks, setTasks] = useState<TaskWithUI[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithUI | null>(null);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useRole();

  const mapTask = (t: Tables<"tasks">): TaskWithUI => ({
    ...t,
    emoji: categoryEmoji[t.category] || "📋",
    lat: t.latitude,
    lng: t.longitude,
  });

  useEffect(() => {
    const fetchTasks = async () => {
      let query = supabase
        .from("tasks")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (role === "owner" && user) {
        query = query.eq("owner_id", user.id);
      }

      const { data } = await query;
      const mapped = (data || []).map(mapTask);
      setTasks(mapped);

      const ownerIds = [...new Set(mapped.map((t) => t.owner_id))];
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ownerIds);
        const names: Record<string, string> = {};
        (profiles || []).forEach((p) => {
          names[p.user_id] = p.full_name || "İsimsiz Kullanıcı";
        });
        setOwnerNames(names);
      }
    };
    fetchTasks();

    const channel = supabase
      .channel("home-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newTask = mapTask(payload.new as Tables<"tasks">);
          if (newTask.status === "open") {
            setTasks((prev) => [newTask, ...prev]);
            setOwnerNames((prev) => {
              if (prev[newTask.owner_id]) return prev;
              supabase
                .from("profiles")
                .select("full_name")
                .eq("user_id", newTask.owner_id)
                .maybeSingle()
                .then(({ data }) => {
                  setOwnerNames((p) => ({
                    ...p,
                    [newTask.owner_id]: data?.full_name || "İsimsiz Kullanıcı",
                  }));
                });
              return prev;
            });
          }
        } else if (payload.eventType === "UPDATE") {
          const updated = mapTask(payload.new as Tables<"tasks">);
          setTasks((prev) => {
            if (updated.status !== "open") return prev.filter((t) => t.id !== updated.id);
            return prev.map((t) => (t.id === updated.id ? updated : t));
          });
        } else if (payload.eventType === "DELETE") {
          const old = payload.old as { id: string };
          setTasks((prev) => prev.filter((t) => t.id !== old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, user]);

  const handleTaskClick = (task: { id: string }) => {
    const matched = tasks.find((t) => t.id === task.id);
    if (matched) setSelectedTask(matched);
  };

  const mapPins = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    price: t.current_price || t.price,
    lat: t.lat,
    lng: t.lng,
    emoji: t.emoji,
    urgent: t.urgency === "urgent",
    estimatedMinutes: t.estimated_minutes ?? undefined,
    ownerName: ownerNames[t.owner_id],
  }));

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background safe-top">
      {/* Header / Karşılama Mesajı */}
      <div className="relative z-10 flex items-start justify-between px-5 pb-3 pt-4 bg-background/80 backdrop-blur-md">
        <div>
          <h1 className="text-xl font-black text-foreground">
            {role === "tasker" ? "Hoş geldin! 👋" : "Merhaba! 👋"}
          </h1>
          <p className="text-xs text-muted-foreground font-semibold">
            {role === "tasker" ? "Etrafındaki işlere göz at" : "Bugün nasıl yardım almak istersin?"}
          </p>
        </div>
        <button
          onClick={() => navigate("/notifications")}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
        >
          <Bell size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Harita alanı — Karşılama mesajı ile Alt Menü (BottomNav) arasını tamamen doldurur */}
      <div className="relative flex-1 w-full overflow-hidden pb-[calc(var(--bottom-nav-height,72px)+env(safe-area-inset-bottom,0px))]">
        <TaskMap tasks={mapPins} onTaskClick={handleTaskClick} />

        {/* İstatistik Kartları Overlay */}
        {role === "tasker" && (
          <div className="pointer-events-none absolute inset-x-4 bottom-[calc(var(--bottom-nav-height,72px)+1rem)] z-10 flex gap-3">
            <div className="pointer-events-auto flex flex-1 items-center gap-2 rounded-xl bg-card/95 px-3 py-2.5 shadow-card backdrop-blur">
              <Zap size={16} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Açık İşler</p>
                <p className="text-sm font-black text-foreground">{tasks.length} iş var</p>
              </div>
            </div>
            <div className="pointer-events-auto flex flex-1 items-center gap-2 rounded-xl bg-card/95 px-3 py-2.5 shadow-card backdrop-blur">
              <MapPin size={16} className="text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Yakınında</p>
                <p className="text-sm font-black text-foreground">{tasks.length} iş</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detay Kartı */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailSheet
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Home;
