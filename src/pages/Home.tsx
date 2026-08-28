import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, MapPin, Bell } from "lucide-react";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import TaskMap from "@/components/TaskMap";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import BottomNav from "@/components/BottomNav";
import RouteMap from "@/components/RouteMap";
import ReviewDialog from "@/components/ReviewDialog";
import { usePendingReviews } from "@/hooks/usePendingReviews";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getTaskEmoji } from "@/lib/taskCategories";
import { computePrice } from "@/lib/dynamicPricing";
import { fetchAssignmentCounts } from "@/lib/assignments";


type TaskWithUI = Tables<"tasks"> & {
  emoji: string;
  lat: number;
  lng: number;
};

const Home = () => {
  const [tasks, setTasks] = useState<TaskWithUI[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithUI | null>(null);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [fillCounts, setFillCounts] = useState<Record<string, number>>({});
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const unreadMessages = useUnreadNotifications();
  const { user } = useAuth();
  const { pending: pendingReviews, refresh: refreshPendingReviews } = usePendingReviews();


  const mapTask = (t: Tables<"tasks">): TaskWithUI => ({
    ...t,
    emoji: getTaskEmoji(t.category, t.subcategory, t.title),
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

      const { data } = await query;
      const mapped = (data || []).map(mapTask);
      setTasks(mapped);

      setFillCounts(await fetchAssignmentCounts(mapped.map((t) => t.id)));



      // Fetch owner names for map pin popups
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

    const assignmentChannel = supabase
      .channel("home-assignments")
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignments" }, async () => {
        setTasks((prev) => {
          fetchAssignmentCounts(prev.map((t) => t.id)).then(setFillCounts);
          return prev;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(assignmentChannel);
    };
  }, [user]);


  // Canlı fiyat düşüşü: her 15 sn'de bir yeniden hesapla, değişince DB'ye yaz (sadece iş sahibi)
  const [priceTick, setPriceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPriceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    tasks.forEach((t) => {
      if (t.owner_id !== user.id) return;
      const { price } = computePrice(t);
      if (price !== (t.current_price ?? t.price)) {
        supabase.from("tasks").update({ current_price: price }).eq("id", t.id).then(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceTick, tasks, user]);

  const handleTaskClick = (task: { id: string }) => {
    const matched = tasks.find((t) => t.id === task.id);
    if (matched) {
      setSelectedTask(matched);
      setSearchParams({ task: matched.id });
    }
  };

  // URL'deki ?task= parametresine göre detay sayfasını aç/kapat
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId) {
      setSelectedTask(null);
      return;
    }
    const matched = tasks.find((t) => t.id === taskId);
    if (matched) setSelectedTask(matched);
  }, [searchParams, tasks]);

  const mapPins = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    price: computePrice(t).price,
    lat: t.lat,
    lng: t.lng,
    emoji: t.emoji,
    urgent: t.urgency === "urgent",
    estimatedMinutes: t.estimated_minutes ?? undefined,
    ownerName: ownerNames[t.owner_id],
    filled: fillCounts[t.id] ?? 0,
    personCount: t.person_count ?? 1,
  }));






  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="relative z-10 flex items-start justify-between px-5 pb-3 pt-4">
        <div>
          <h1 className="text-xl font-black text-foreground">
            Merhaba! 👋
          </h1>
          <p className="text-xs text-muted-foreground font-semibold">
            Etrafındaki yardım çağrılarına göz at
          </p>
        </div>
        <button
          onClick={() => navigate("/notifications")}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
        >
          {unreadMessages > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black text-destructive-foreground">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
          <Bell size={18} className="text-muted-foreground" />
        </button>
      </div>

      {/* Map — fills all remaining space down to the bottom nav */}
      <div className="relative mx-5 mb-[calc(1.25rem+var(--bottom-nav-height,64px))] flex-1 overflow-hidden rounded-2xl border border-border shadow-card">
        <TaskMap tasks={mapPins} onTaskClick={handleTaskClick} />

        {/* Stats overlay, floating on top of the map */}
        {(
          <div className="pointer-events-none absolute inset-x-3 bottom-3 flex gap-3">
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

      {/* Task Detail Sheet */}
      <AnimatePresence>
        {selectedTask && (
          <TaskDetailSheet
            task={selectedTask}
            onClose={() => {
              setSelectedTask(null);
              setSearchParams({});
            }}
          />
        )}
      </AnimatePresence>

      <ReviewDialog
        review={pendingReviews[0] || null}
        onDone={async () => { await refreshPendingReviews(); }}
      />

      <BottomNav />
    </div>
  );
};

export default Home;
