import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { User, MessageCircle, Zap, MapPin, ChevronRight, Plus, Briefcase } from "lucide-react";
import TaskMap from "@/components/TaskMap";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import BottomNav from "@/components/BottomNav";
import RouteMap from "@/components/RouteMap";
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
  const [loading, setLoading] = useState(true);
  const [locationName, setLocationName] = useState("Konum alınıyor...");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useRole();

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationName("Konum bulunamadı");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=tr`,
          );
          const data = await res.json();
          const addr = data.address || {};
          const town = addr.town || addr.county || "";
          const district = addr.suburb || addr.neighbourhood || "";
          const city = addr.city || addr.province || addr.state || "";
          const locationParts = [district || town, district ? town : "", city].filter(Boolean);
          const unique = [...new Set(locationParts)];
          setLocationName(unique.length > 0 ? unique.join(", ") : "Konum bulundu");
        } catch {
          setLocationName("Konum bulundu");
        }
      },
      () => setLocationName("Konum izni verilmedi"),
    );
  }, []);

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

      // Owner mode: show only own tasks
      if (role === "owner" && user) {
        query = query.eq("owner_id", user.id);
      }

      const { data } = await query;
      setTasks((data || []).map(mapTask));
      setLoading(false);
    };
    fetchTasks();

    const channel = supabase
      .channel("home-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newTask = mapTask(payload.new as Tables<"tasks">);
          if (newTask.status === "open") setTasks((prev) => [newTask, ...prev]);
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
  }));




  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">📍 {locationName}</p>
          <h1 className="text-xl font-black text-foreground">{role === "tasker" ? "İş Al 🔧" : "İş Ver 👋"}</h1>
          <p className="text-xs text-primary font-semibold">{role === "tasker" ? "İş Al Modundasın" : "İş Ver Modundasın"}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/messages")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
          >
            <MessageCircle size={18} className="text-muted-foreground" />
          </button>
          <button
            onClick={() => navigate("/profile")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
          >
            <User size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div
        className="relative mx-5 mb-4 overflow-hidden rounded-2xl border border-border shadow-card"
        style={{ height: 260 }}
      >
        <TaskMap tasks={mapPins} onTaskClick={handleTaskClick} />
      </div>

      {/* Stats */}
      <div className="mx-5 mb-4 flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary/5 px-3 py-2.5">
          <Zap size={16} className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Açık İşler</p>
            <p className="text-sm font-black text-foreground">{tasks.length} iş var</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-accent/30 px-3 py-2.5">
          <MapPin size={16} className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Yakınında</p>
            <p className="text-sm font-black text-foreground">{tasks.length} iş</p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">Yakındaki İşler</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center py-10">
            <p className="text-sm text-muted-foreground">Henüz açık iş yok</p>
          </div>
        ) : (
          <div className="space-y-3 pb-24">
            {tasks.map((task, i) => (
              <motion.button
                key={task.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                onClick={() => setSelectedTask(task)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-all active:scale-[0.98]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl">
                  {task.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{task.title}</h3>
                    {task.urgency === "urgent" && (
                      <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                        🔥 ACİL
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>~{task.estimated_minutes} dk</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base font-black text-primary">{task.current_price || task.price} ₺</p>
                  <ChevronRight size={14} className="ml-auto text-muted-foreground" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Task Detail Sheet */}
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
