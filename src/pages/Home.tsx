import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n";
import { getTaskCurrency } from "@/lib/currency";
import { AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Zap, MapPin, Bell, Crosshair, SlidersHorizontal, X, Check, Map, Satellite } from "lucide-react";
import logo from "@/assets/logo.png";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import TaskMap from "@/components/TaskMap";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import BottomNav from "@/components/BottomNav";
import RouteMap from "@/components/RouteMap";
import ReviewDialog from "@/components/ReviewDialog";
import ReferralPrompt from "@/components/ReferralPrompt";
import { usePendingReviews } from "@/hooks/usePendingReviews";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getTaskEmoji, ALL_TASK_CATEGORIES, getTaskCategory } from "@/lib/taskCategories";
import { computePrice } from "@/lib/dynamicPricing";
import { fetchAssignmentCounts } from "@/lib/assignments";
import { distanceMeters } from "@/lib/taskLifecycle";
import { Geolocation } from "@capacitor/geolocation";
import { ensureLocationPermission } from "@/lib/geo";
import { toast } from "sonner";
import { getFuzzedLocation } from "@/lib/locationPrivacy";
import { fetchBlockedIds } from "@/lib/blocks";
import { List as ListIcon, MapIcon } from "lucide-react";

type TaskWithUI = Tables<"tasks"> & {
  emoji: string;
  lat: number;
  lng: number;
};

const RADIUS_M = 100_000;

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();

const Home = () => {
  const t = useT();
  const [tasks, setTasks] = useState<TaskWithUI[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskWithUI | null>(null);
  const [ownerNames, setOwnerNames] = useState<Record<string, string>>({});
  const [ownerAvatars, setOwnerAvatars] = useState<Record<string, string | null>>({});
  const [fillCounts, setFillCounts] = useState<Record<string, number>>({});

  // Filtreleme
  const [showFilters, setShowFilters] = useState(false);
  const [filterUrgency, setFilterUrgency] = useState<"all" | "urgent" | "can_wait">("all");
  const [filterNoTools, setFilterNoTools] = useState(false);
  const [filterMyTools, setFilterMyTools] = useState(false);
  const [filterCategoryIds, setFilterCategoryIds] = useState<string[]>([]);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [myOwnedTools, setMyOwnedTools] = useState<string[]>([]);
  const [myCustomOwnedTools, setMyCustomOwnedTools] = useState<string[]>([]);
  const [userPos, setUserPos] = useState<[number, number] | null>(() => {
    try {
      const cached = localStorage.getItem("bielat_last_location");
      return cached ? (JSON.parse(cached) as [number, number]) : null;
    } catch {
      return null;
    }
  });
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(userPos);
  const [mapType, setMapType] = useState<"standard" | "satellite">("satellite");
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [sortBy, setSortBy] = useState<"distance" | "price_desc" | "price_asc" | "urgency" | "new">("distance");
  const [blockedIds, setBlockedIds] = useState<string[]>([]);
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
    (async () => {
      try {
        // Uygulama açılır açılmaz tek bir izin penceresi çıksın (tam konum).
        // Önce yaklaşık, sonra tam konum sorulmasını engeller.
        if ((await ensureLocationPermission()) !== "granted") return;
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });

        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(coords);
        // Konum neredeyse aynıysa haritayı yeniden ortalama (titremeyi önler)
        setMapCenter((prev) =>
          prev && distanceMeters(prev[0], prev[1], coords[0], coords[1]) < 40 ? prev : coords,
        );
        try {
          localStorage.setItem("bielat_last_location", JSON.stringify(coords));
        } catch {}
      } catch {
        // İzin verilmedi veya konum alınamadı; sessizce geç, cache'lenmiş konum varsa o kullanılır
      }
    })();
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

  // Canlı fiyat düşüşü: her 15 sn'de bir arayüzü tazele (fiyatı sunucu hesaplar)
  const [priceTick, setPriceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPriceTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);


  // Kullanıcının profiline kaydettiği aletleri çek (eşleştirme filtresi için)
  const fetchMyTools = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("owned_tools, custom_owned_tools")
      .eq("user_id", user.id)
      .maybeSingle();
    setMyOwnedTools(data?.owned_tools || []);
    setMyCustomOwnedTools(data?.custom_owned_tools || []);
  };

  useEffect(() => {
    fetchMyTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Kullanıcı Profil'de aletlerini güncelleyip Home'a dönebilir; filtre panelini
  // her açtığında taze veri çekerek "eski alet listesiyle filtreleme" sorununu önle
  useEffect(() => {
    if (showFilters) fetchMyTools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showFilters]);

  // Bir görevin gereken aletlerinin tamamı elimdekilerde var mı?
  const matchesMyTools = (t: TaskWithUI) => {
    if (!t.needs_tools) return true;
    // İş sahibi aletleri kendisi sağlıyorsa, "el atan"ın alet sahibi olması gerekmez
    if (t.tool_provider === "owner") return true;
    const required = t.required_tools || [];
    const requiredCustom = (t.custom_tools || []).map((c) => normalize(c));
    const ownedCustomNormalized = myCustomOwnedTools.map((c) => normalize(c));
    const hasAllStandard = required.every((id) => myOwnedTools.includes(id));
    const hasAllCustom = requiredCustom.every((c) => ownedCustomNormalized.includes(c));
    return hasAllStandard && hasAllCustom;
  };

  useEffect(() => {
    if (!user) return;
    fetchBlockedIds(user.id).then(setBlockedIds);
  }, [user]);

  const filteredTasks = tasks.filter((t) => {
    if (blockedIds.includes(t.owner_id)) return false;
    if (filterUrgency !== "all" && t.urgency !== filterUrgency) return false;
    if (filterNoTools && t.needs_tools) return false;
    if (filterMyTools && !matchesMyTools(t)) return false;
    if (filterCategoryIds.length > 0) {
      const catId = getTaskCategory(t.category as string, t.subcategory, t.title)?.id;
      if (!catId || !filterCategoryIds.includes(catId)) return false;
    }
    return true;
  });

  const activeFilterCount =
    (filterUrgency !== "all" ? 1 : 0) +
    (filterNoTools ? 1 : 0) +
    (filterMyTools ? 1 : 0) +
    (filterCategoryIds.length > 0 ? 1 : 0);

  const taskDistance = (t: TaskWithUI) =>
    userPos ? distanceMeters(userPos[0], userPos[1], t.lat, t.lng) : Number.MAX_SAFE_INTEGER;

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "distance") return taskDistance(a) - taskDistance(b);
    if (sortBy === "price_desc") return computePrice(b).price - computePrice(a).price;
    if (sortBy === "price_asc") return computePrice(a).price - computePrice(b).price;
    if (sortBy === "urgency") {
      const rank = (t: TaskWithUI) => (t.urgency === "urgent" ? 0 : 1);
      return rank(a) - rank(b) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const handleTaskClick = (task: { id: string }) => {
    const matched = tasks.find((t) => t.id === task.id);
    if (matched) {
      setSelectedTask(matched);
      setSearchParams({ task: matched.id });
    }
  };

  const handleLocateMe = async () => {
    // Bilinen konum varsa anında oraya uç, GPS'i arka planda tazele
    if (userPos) setMapCenter([userPos[0], userPos[1]]);
    try {
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 8000,
      });
      const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      setUserPos(coords);
      setMapCenter(coords);
      try {
        localStorage.setItem("bielat_last_location", JSON.stringify(coords));
      } catch {}
    } catch {
      toast.error(t("Konum alınamadı. Lütfen konum izni verip tekrar dene."));
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

  const mapPins = filteredTasks.map((t) => {
    const isOwn = t.owner_id === user?.id;
    // Kendi çağrısını gerçek konumuyla göster (kolayca bulabilsin), başkalarınınkini bulanıklaştır
    const { lat, lng } = isOwn
      ? { lat: t.lat, lng: t.lng }
      : getFuzzedLocation(t.lat, t.lng, t.id, 500);
    return {
      id: t.id,
      title: t.title,
      price: computePrice(t).price,
      currency: getTaskCurrency(t),
      lat,
      lng,
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
      isOwn,
    };
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="relative z-10 flex items-start justify-between px-5 pb-3 pt-4">
        <div>
          <h1 className="flex items-center gap-1.5 text-xl font-black text-foreground">
            {t("Merhaba!")}
            <img src={logo} alt="Bi' El At" className="inline-block h-7 w-auto align-middle" />
          </h1>
          <p className="text-xs text-muted-foreground font-semibold">{t("Yardım çağrılarına el at veya çağrıda bulun")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode((v) => (v === "map" ? "list" : "map"))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
            aria-label={viewMode === "map" ? t("Liste görünümü") : t("Harita görünümü")}
          >
            {viewMode === "map" ? (
              <ListIcon size={18} className="text-muted-foreground" />
            ) : (
              <MapIcon size={18} className="text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => setShowFilters(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
          >
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
            <SlidersHorizontal size={18} className="text-muted-foreground" />
          </button>
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
      </div>

      {/* Map — fills all remaining space edge-to-edge, bottom nav floats on top */}
      <div className="relative z-0 flex-1 overflow-hidden">
        {viewMode === "map" && (<>
        <TaskMap
          tasks={mapPins}
          onTaskClick={handleTaskClick}
          center={mapCenter || undefined}
          userPos={userPos}
          mapType={mapType}
        />

        {/* Stats overlay, floating on top of the map */}
        {
          <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-end gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 shadow-card backdrop-blur">
              <Zap size={12} className="text-primary" />
              <p className="text-[11px] font-black text-foreground">{filteredTasks.length} {t("açık iş")}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1.5 shadow-card backdrop-blur">
              <MapPin size={12} className="text-primary" />
              <p className="text-[11px] font-black text-foreground">{t("100 km yakınında")}</p>
            </div>
          </div>
        }

        {/* Map type toggle */}
        <button
          onClick={() => setMapType((t) => (t === "satellite" ? "standard" : "satellite"))}
          className="fixed bottom-36 right-4 z-[600] flex h-8 w-8 items-center justify-center rounded-full bg-card text-foreground shadow-card pointer-events-auto"
          aria-label={mapType === "satellite" ? t("Normal harita") : t("Uydu görünümü")}
        >
          {mapType === "satellite" ? <Map size={18} /> : <Satellite size={18} />}
        </button>

        {/* Locate me button */}
        <button
          onClick={handleLocateMe}
          className="fixed bottom-24 right-4 z-[600] flex h-8 w-8 items-center justify-center rounded-full bg-sky-200 text-sky-700 shadow-md pointer-events-auto"
          aria-label={t("Konumuma git")}
        >
          <Crosshair size={22} className="text-sky-700" />
        </button>
        </>)}

        {viewMode === "list" && (
          <div className="h-full overflow-y-auto px-5 pb-28 scrollbar-hide">
            <div className="sticky top-0 z-10 -mx-5 mb-3 bg-background/95 px-5 py-2 backdrop-blur">
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {([
                  ["distance", "En yakın"],
                  ["price_desc", "En yüksek ücret"],
                  ["price_asc", "En düşük ücret"],
                  ["urgency", "Acil olanlar"],
                  ["new", "En yeni"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setSortBy(id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-black ${
                      sortBy === id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground shadow-card"
                    }`}
                  >
                    {t(label)}
                  </button>
                ))}
              </div>
            </div>

            {sortedTasks.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm font-bold text-foreground">{t("Yakınında açık iş yok")}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t("Filtreleri değiştirip tekrar dene.")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedTasks.map((task) => {
                  const dist = userPos ? taskDistance(task) : null;
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card active:scale-[0.98]"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                        {task.emoji}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {task.urgency === "urgent" && (
                            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-black text-destructive">
                              {t("ACİL")}
                            </span>
                          )}
                          <h3 className="truncate text-sm font-black text-foreground">{task.title}</h3>
                        </div>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {ownerNames[task.owner_id] || t("Kullanıcı")}
                          {dist !== null && ` · ${dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`}`}
                          {task.estimated_minutes ? ` · ${task.estimated_minutes} ${t("dk")}` : ""}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                          {(fillCounts[task.id] ?? 0)}/{task.person_count ?? 1} {t("kişi")}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-primary">
                          {computePrice(task).price} {getTaskCurrency(task)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
        onDone={async () => {
          await refreshPendingReviews();
        }}
      />

      {/* Filtre paneli */}
      <AnimatePresence>
        {showFilters && (
          <>
            <div
              className="fixed inset-0 z-[700] bg-black/40"
              onClick={() => setShowFilters(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-[701] max-h-[80vh] overflow-y-auto rounded-t-3xl bg-background p-5 safe-bottom">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-black text-foreground">{t("Filtrele")}</h2>
                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        setFilterUrgency("all");
                        setFilterNoTools(false);
                        setFilterMyTools(false);
                        setFilterCategoryIds([]);
                        setCategoryQuery("");
                      }}
                      className="text-xs font-bold text-primary"
                    >
                      {t("Temizle")}
                    </button>
                  )}
                  <button onClick={() => setShowFilters(false)}>
                    <X size={20} className="text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="mb-2 text-xs font-bold text-muted-foreground">
                    {t("Kategori")} {filterCategoryIds.length > 0 && `(${filterCategoryIds.length} ${t("seçili")})`}
                  </p>
                  <div className="mb-2 flex items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-2.5 focus-within:border-primary">
                    <SlidersHorizontal size={14} className="text-muted-foreground" />
                    <input
                      value={categoryQuery}
                      onChange={(e) => setCategoryQuery(e.target.value)}
                      placeholder={t("Kategori ara... (ör. temizlik, tesisat)")}
                      className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                    />
                  </div>

                  {filterCategoryIds.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {filterCategoryIds.map((id) => {
                        const cat = ALL_TASK_CATEGORIES.find((c) => c.id === id);
                        if (!cat) return null;
                        return (
                          <span
                            key={id}
                            className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-semibold text-primary-foreground"
                          >
                            {cat.emoji} {t(cat.label)}
                            <button onClick={() => setFilterCategoryIds((prev) => prev.filter((x) => x !== id))}>
                              <X size={11} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {categoryQuery.trim().length > 0 && (
                    <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-card p-2">
                      {ALL_TASK_CATEGORIES.filter(
                        (c) => normalize(c.label).includes(normalize(categoryQuery)) && !filterCategoryIds.includes(c.id)
                      )
                        .slice(0, 20)
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setFilterCategoryIds((prev) => [...prev, c.id]);
                              setCategoryQuery("");
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-foreground hover:bg-muted"
                          >
                            <span>{c.emoji}</span>
                            <span>{t(c.label)}</span>
                          </button>
                        ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold text-muted-foreground">{t("Aciliyet")}</p>
                  <div className="flex gap-2">
                    {[
                      { value: "all" as const, label: t("Tümü") },
                      { value: "urgent" as const, label: t("Acil") },
                      { value: "can_wait" as const, label: t("Bekleyebilir") },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setFilterUrgency(opt.value)}
                        className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                          filterUrgency === opt.value
                            ? "gradient-warm text-primary-foreground shadow-soft"
                            : "border border-border bg-card text-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setFilterNoTools((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3.5"
                >
                  <span className="text-sm font-semibold text-foreground">
                    {t("Sadece alet gerektirmeyen işler")}
                  </span>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                      filterNoTools ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                    }`}
                  >
                    {filterNoTools && <Check size={14} strokeWidth={3} />}
                  </span>
                </button>

                <button
                  onClick={() => setFilterMyTools((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3.5"
                >
                  <div className="text-left">
                    <span className="block text-sm font-semibold text-foreground">
                      {t("Elimdeki aletlerle yapabileceğim işler")}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t("Profilinde işaretlediğin aletlere göre eşleştirir")}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {t("Sahip olduğun tüm alet/edevatı kapsayan yardım çağrıları listelenir.")}
                    </span>
                  </div>
                  <span
                    className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                      filterMyTools ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
                    }`}
                  >
                    {filterMyTools && <Check size={14} strokeWidth={3} />}
                  </span>
                </button>
              </div>

              <button
                onClick={() => setShowFilters(false)}
                className="mt-6 w-full rounded-xl gradient-warm py-3.5 text-sm font-bold text-primary-foreground shadow-soft active:scale-95"
              >
                {t("Sonuçları Göster")} ({filteredTasks.length})
              </button>
            </div>
          </>
        )}
      </AnimatePresence>

      <ReferralPrompt />
      <BottomNav />
    </div>
  );
};

export default Home;
