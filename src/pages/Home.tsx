import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Bell, Search, Plus, User, Zap, X, Star, Clock, ChevronRight } from "lucide-react";
import TaskMap from "@/components/TaskMap";
import { useAuth } from "@/contexts/AuthContext";
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

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setLocationName("Konum bulunamadı");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=tr`
          );
          const data = await res.json();
          const addr = data.address || {};
          // Prefer town (ilçe) over district which often returns "Merkez"
          const town = addr.town || addr.county || "";
          const district = addr.suburb || addr.neighbourhood || "";
          const city = addr.city || addr.province || addr.state || "";
          const locationParts = [district || town, district ? town : "", city].filter(Boolean);
          // Remove duplicates (e.g. "Merkez, Merkez, Amasya")
          const unique = [...new Set(locationParts)];
          setLocationName(unique.length > 0 ? unique.join(", ") : "Konum bulundu");
        } catch {
          setLocationName("Konum bulundu");
        }
      },
      () => setLocationName("Konum izni verilmedi")
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
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      setTasks((data || []).map(mapTask));
      setLoading(false);
    };
    fetchTasks();

    const channel = supabase
      .channel("home-tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newTask = mapTask(payload.new as Tables<"tasks">);
            if (newTask.status === "open") {
              setTasks((prev) => [newTask, ...prev]);
            }
          } else if (payload.eventType === "UPDATE") {
            const updated = mapTask(payload.new as Tables<"tasks">);
            setTasks((prev) => {
              if (updated.status !== "open") {
                return prev.filter((t) => t.id !== updated.id);
              }
              return prev.map((t) => (t.id === updated.id ? updated : t));
            });
          } else if (payload.eventType === "DELETE") {
            const old = payload.old as { id: string };
            setTasks((prev) => prev.filter((t) => t.id !== old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
          <h1 className="text-xl font-black text-foreground">Merhaba! 👋</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate("/search")} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
            <Search size={18} className="text-muted-foreground" />
          </button>
          <button onClick={() => navigate("/notifications")} className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
            <Bell size={18} className="text-muted-foreground" />
            <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="relative mx-5 mb-4 overflow-hidden rounded-2xl border border-border shadow-card" style={{ height: 260 }}>
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
                      <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">🔥 ACİL</span>
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
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="fixed inset-0 z-40 bg-foreground/20"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-card p-6 shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-2xl">
                    {selectedTask.emoji}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">{selectedTask.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock size={12} />
                      <span>~{selectedTask.estimated_minutes} dk</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>

              <p className="mb-4 text-sm text-muted-foreground">{selectedTask.description}</p>

              <div className="mb-4 rounded-xl bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ücret</span>
                  <span className="text-2xl font-black text-primary">{selectedTask.current_price || selectedTask.price} ₺</span>
                </div>
                {selectedTask.urgency === "urgent" && (
                  <p className="mt-1 text-xs font-semibold text-destructive">🔥 Acil iş — hemen başlaman bekleniyor</p>
                )}
              </div>

              {selectedTask.address_note && (
                <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={14} className="text-primary" />
                  <span>{selectedTask.address_note}</span>
                </div>
              )}

              <button className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]">
                Kabul Et ✋
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-card px-4 pb-2 pt-3 safe-bottom">
        <button onClick={() => navigate("/home")} className="flex flex-col items-center gap-0.5">
          <MapPin size={20} className="text-primary" />
          <span className="text-[10px] font-bold text-primary">Keşfet</span>
        </button>
        <button onClick={() => navigate("/my-tasks")} className="flex flex-col items-center gap-0.5">
          <Search size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">İşlerim</span>
        </button>
        <button
          onClick={() => navigate("/create-task")}
          className="gradient-warm -mt-5 flex h-14 w-14 items-center justify-center rounded-full shadow-soft"
        >
          <Plus size={24} className="text-primary-foreground" />
        </button>
        <button onClick={() => navigate("/notifications")} className="flex flex-col items-center gap-0.5">
          <Bell size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">Bildirim</span>
        </button>
        <button onClick={() => navigate("/profile")} className="flex flex-col items-center gap-0.5">
          <User size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">Profil</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
