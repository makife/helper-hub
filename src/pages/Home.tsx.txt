import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, MapPin, Bell, Crosshair } from "lucide-react";
import logo from "@/assets/logo.png";
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
import { distanceMeters } from "@/lib/taskLifecycle";
import { getFuzzedLocation } from "@/lib/locationPrivacy";

type TaskWithUI = Tables<"tasks"> & {
  emoji: string;
  lat: number;
  lng: number;
};

const RADIUS_M = 100_000;

const Home = () => {
  const [tasks, setTasks] = useState<TaskWithUI[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithUI | null>(null);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [ownerAvatars, setOwnerAvatars] = useState<Record<string, string | null>>({});
  const [fillCounts, setFillCounts] = useState<Record<string, number>>({});
  const [userPos, setUserPos] = useState<[number, number] | null>(() => {
    try {
      const cached = localStorage.getItem("bielat_last_location");
      return cached ? (JSON.parse(cached) as [number, number]) : null;
    } catch {
      return null;
    }
  });
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(userPos);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const unreadMessages = useUnreadNotifications();
  const { user } = useAuth();
  const { pending: pendingReviews, refresh: refreshPendingReviews } = usePendingReviews();

  const withinRadius = (lat: number, lng: number) => {
    if (!userPos) return true;
    return distanceMeters(userPos[0], userPos[1], lat, lng) <= RADIUS_M;
  };

  const mapTask = (t: Tables<"tasks">): TaskWithUI => ({
    ...t,
    emoji: getTaskEmoji(t.category, t.subcategory, t.title),
    lat: t.latitude,
    lng: t.longitude,
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserPos(coords);
          setMapCenter(coords);
          try {
            localStorage.setItem("bielat_last_location", JSON.stringify(coords));
          } catch {}
        },
        () => {}, // silently fail
      );
    }
  }, []);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });

      const mapped = (data || []).map(mapTask).filter((t) => withinRadius(t.lat, t.lng));
      setTasks(mapped);

      setFillCounts(await fetchAssignmentCounts(mapped.map((t) => t.id)));

      // Fetch owner names and avatars for map pin popups
      const ownerIds = [...new Set(mapped.map((t) => t.owner_id))];
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ownerIds);
        const names: Record<string, string> = {};
        const avatars: Record<string, string | null> = {};
        (profiles || []).forEach((p) => {
          names[p.user_id] = p.full_name || "İsimsiz Kullanıcı";
          avatars[p.user_id] = p.avatar_url || null;
        });
        setOwnerNames(names);
        setOwnerAvatars(avatars);
      }
    };
    fetchTasks();

    const channel = supabase
      .channel("home-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const newTask = mapTask(payload.new as Tables<"tasks">);
          if (newTask.status === "open" && withinRadius(newTask.lat, newTask.lng)) {
            setTasks((prev) => [newTask, ...prev]);
            setOwnerNames((prev) => {
              if (prev[newTask.owner_id]) return prev;
              supabase
                .from("profiles")
                .select("full_name, avatar_url")
                .eq("user_id", newTask.owner_id)
                .maybeSingle()
                .then(({ data }) => {
                  setOwnerNames((p) => ({
                    ...p,
                    [newTask.owner_id]: data?.full_name || "İsimsiz Kullanıcı",
                  }));
                  setOwnerAvatars((p) => ({
                    ...p,
                    [newTask.owner_id]: data?.avatar_url || null,
                  }));
                });
              return prev;
            });
          }
        } else if (payload.eventType === "UPDATE") {
          const updated = mapTask(payload.new as Tables<"tasks">);
          setTasks((prev) => {
            if (updated.status !== "open" || !withinRadius(updated.lat, updated.lng)) {
              return prev.filter((t) => t.id !== updated.id);
            }
            const exists = prev.some((t) => t.id === updated.id);
            if (exists) return prev.map((t) => (t.id === updated.id ? updated : t));
            return [updated, ...prev];
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
  }, [user, userPos]);

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
        supabase
          .from("tasks")
          .update({ current_price: price })
          .eq("id", t.id)
          .then(() => {});
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

  const handleLocateMe = () => {
    // Bilinen konum varsa anında oraya uç, GPS'i arka planda tazele
    if (userPos) setMapCenter([userPos[0], userPos[1]]);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserPos(coords);
          setMapCenter(coords);
          try {
            localStorage.setItem("bielat_last_location", JSON.stringify(coords));
          } catch {}
        },
        () => {}, // silently fail
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 },
      );
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

  const mapPins = tasks.map((t) => {
    const fuzzed = getFuzzedLocation(t.lat, t.lng, t.id, 500);
    return {
      id: t.id,
      title: t.title,
      price: computePrice(t).price,
      lat: fuzzed.lat,
      lng: fuzzed.lng,
      emoji: t.emoji,
      urgent: t.urgency === "urgent",
      estimatedMinutes: t.estimated_minutes ?? undefined,
      ownerName: ownerNames[t.owner_id],
      ownerAvatar: ownerAvatars[t.owner_id],
      filled: fillCounts[t.id] ?? 0,
      personCount: t.person_count ?? 1,
      needsTools: t.needs_tools ?? false,
      toolProvider: (t.tool_provider as "helper" | "owner" | null) ?? undefined,
      toolsCount: (t.required_tools?.length ?? 0) + (t.custom_tools?.length ?? 0),
    };
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="relative z-10 flex items-start justify-between px-5 pb-3 pt-4">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-black text-foreground">
            Merhaba!
            <img src={logo} alt="Bi' El At" className="inline-block h-7 w-auto align-middle" />
          </h1>
          <p className="text-xs text-muted-foreground font-semibold">Yardım çağrılarına el at veya çağrıda bulun</p>
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

      {/* Map — fills all remaining space edge-to-edge, bottom nav floats on top */}
      <div className="relative z-0 flex-1 overflow-hidden">
        <TaskMap tasks={mapPins} onTaskClick={handleTaskClick} center={mapCenter || undefined} userPos={userPos} />

        {/* Stats overlay, floating on top of the map */}
        {
          <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-end gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 shadow-card backdrop-blur">
              <Zap size={12} className="text-primary" />
              <p className="text-[11px] font-black text-foreground">{tasks.length} açık iş</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 shadow-card backdrop-blur">
              <MapPin size={12} className="text-primary" />
              <p className="text-[11px] font-black text-foreground">100 km yakınında</p>
            </div>
          </div>
        }

        {/* Locate me button */}
        <button
          onClick={handleLocateMe}
          className="fixed bottom-24 right-4 z-[600] flex h-8 w-8 items-center justify-center rounded-full bg-sky-200 text-sky-700 shadow-md pointer-events-auto"
          aria-label="Konumuma git"
        >
          <Crosshair size={22} className="text-sky-700" />
        </button>
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
        onDone={async () => {
          await refreshPendingReviews();
        }}
      />

      <BottomNav />
    </div>
  );
};

export default Home;
