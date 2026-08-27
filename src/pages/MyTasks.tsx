import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Clock, Lightbulb, Blinds, Armchair, Hammer, Wrench, Package, 
  Trash2, Edit3, X, Zap, Image as ImageIcon, Sparkles, Droplet, Key, Laptop, 
  Bike, Paintbrush, Utensils, Scissors, Car, Dog, Shirt, Tv, Wifi, Smartphone, 
  Plug, Cat, Hospital, Sprout, BatteryCharging, HeartHandshake, UserCheck, 
  Baby, BookOpen, MessageSquare, Guitar, Camera, PartyPopper, UtensilsCrossed, 
  Hourglass, WashingMachine, Snowflake, HelpCircle, ShoppingCart, Eye, Timer, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { computePrice, formatCountdown } from "@/lib/dynamicPricing";
import { getTaskEmoji } from "@/lib/taskCategories";
import { leaveTask } from "@/lib/assignments";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";


const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "Açık", color: "text-primary" },
  matched: { label: "Eşleşti", color: "text-accent" },
  in_progress: { label: "Devam Ediyor", color: "text-primary" },
  completed: { label: "Tamamlandı", color: "text-green-600" },
  cancelled: { label: "İptal Edildi", color: "text-destructive" },
};

export const SUB_CATEGORIES = [
  { id: "ampul_takma", emoji: "💡", label: "Ampul Takma", baseEnum: "ampul_takma" },
  { id: "perde_asma", emoji: "🪟", label: "Perde Asma", baseEnum: "perde_asma" },
  { id: "mobilya_monte", emoji: "🪑", label: "Mobilya Montajı", baseEnum: "mobilya_monte" },
  { id: "duvar_tamir", emoji: "🔨", label: "Duvar Tamiri", baseEnum: "duvar_tamir" },
  { id: "kucuk_tamir", emoji: "🔧", label: "Küçük Tamirat", baseEnum: "kucuk_tamir" },
  { id: "musluk_tamir", emoji: "🚰", label: "Musluk / Batarya", baseEnum: "kucuk_tamir" },
  { id: "kapı_kilit", emoji: "🔑", label: "Kilit / Kol Değişimi", baseEnum: "kucuk_tamir" },
  { id: "raf_montaj", emoji: "📐", label: "Tablo / Raf Asma", baseEnum: "duvar_tamir" },
  { id: "silikon_cekme", emoji: "🧪", label: "Silikon Çekme", baseEnum: "kucuk_tamir" },
  { id: "gider_acma", emoji: "🪠", label: "Gider Açma", baseEnum: "kucuk_tamir" },
  { id: "tasima_yardimi", emoji: "📦", label: "Taşıma Yardımı", baseEnum: "tasima_yardimi" },
  { id: "esya_tasima", emoji: "🚚", label: "Ağır Eşya Taşıma", baseEnum: "tasima_yardimi" },
  { id: "kurye_paket", emoji: "✉️", label: "Paket / Evrak Getirme", baseEnum: "tasima_yardimi" },
  { id: "alisveris_teslimat", emoji: "🛒", label: "Market Alışverişi", baseEnum: "tasima_yardimi" },
  { id: "arac_yukleme", emoji: "📦", label: "Araç Yükleme/Boşaltma", baseEnum: "tasima_yardimi" },
  { id: "ev_temizligi", emoji: "🧹", label: "Ev Temizliği", baseEnum: "kucuk_tamir" },
  { id: "cam_silme", emoji: "🧼", label: "Cam Silme", baseEnum: "kucuk_tamir" },
  { id: "balkon_temizligi", emoji: "🪴", label: "Balkon Temizliği", baseEnum: "kucuk_tamir" },
  { id: "utu_yapma", emoji: "👔", label: "Ütü Yapma", baseEnum: "kucuk_tamir" },
  { id: "dolap_duzenleme", emoji: "👗", label: "Dolap Düzenleme", baseEnum: "kucuk_tamir" },
  { id: "hali_yikama", emoji: "🧽", label: "Halı / Koltuk Temizleme", baseEnum: "kucuk_tamir" },
  { id: "tv_kurulum", emoji: "📺", label: "TV / Askı Aparatı", baseEnum: "duvar_tamir" },
  { id: "wifi_internet", emoji: "📡", label: "Wi-Fi / Modem Kurulumu", baseEnum: "kucuk_tamir" },
  { id: "bilgisayar_format", emoji: "💻", label: "PC / Format / Yazılım", baseEnum: "kucuk_tamir" },
  { id: "telefon_kurulum", emoji: "📱", label: "Akıllı Cihaz Kurulumu", baseEnum: "kucuk_tamir" },
  { id: "kablo_duzenleme", emoji: "🔌", label: "Kablo Gizleme/Düzen", baseEnum: "kucuk_tamir" },
  { id: "kopek_gezdirme", emoji: "🐕", label: "Köpek Gezdirme", baseEnum: "tasima_yardimi" },
  { id: "kedi_bakimi", emoji: "🐈", label: "Kedi Besleme / Bakım", baseEnum: "tasima_yardimi" },
  { id: "vet_goturme", emoji: "🏥", label: "Evcil Hayvan Taşıma", baseEnum: "tasima_yardimi" },
  { id: "bahce_sulama", emoji: "🌱", label: "Çiçek / Bahçe Sulama", baseEnum: "kucuk_tamir" },
  { id: "cim_bicme", emoji: "✂️", label: "Çim Biçme / Budama", baseEnum: "kucuk_tamir" },
  { id: "oto_yikama", emoji: "🚗", label: "Araba Yıkama / Temizlik", baseEnum: "kucuk_tamir" },
  { id: "aku_takviye", emoji: "🔋", label: "Akü Takviye / Oto", baseEnum: "kucuk_tamir" },
  { id: "yasli_yardim", emoji: "👵", label: "Yaşlı / Hasta Yardımı", baseEnum: "tasima_yardimi" },
  { id: "refakat", emoji: "🤝", label: "Kısa Süreli Refakat", baseEnum: "tasima_yardimi" },
  { id: "cocuk_oyun", emoji: "🧸", label: "Çocuk Bakımı / Oyun", baseEnum: "tasima_yardimi" },
  { id: "ozel_ders", emoji: "📚", label: "Özel Ders / Ödev", baseEnum: "kucuk_tamir" },
  { id: "dil_pratik", emoji: "🗣️", label: "Yabancı Dil Pratiği", baseEnum: "kucuk_tamir" },
  { id: "muzik_dersi", emoji: "🎸", label: "Enstrüman Eğitimi", baseEnum: "kucuk_tamir" },
  { id: "fotograf_cekimi", emoji: "📸", label: "Fotoğraf Çekimi", baseEnum: "kucuk_tamir" },
  { id: "parti_hazirlik", emoji: "🎈", label: "Organizasyon / Parti", baseEnum: "tasima_yardimi" },
  { id: "yemek_hazirlik", emoji: "🍲", label: "Yemek / İkram Hazırlığı", baseEnum: "kucuk_tamir" },
  { id: "sira_bekleme", emoji: "⏳", label: "Sıra Bekleme Yardımı", baseEnum: "tasima_yardimi" },
  { id: "boya_badana", emoji: "🎨", label: "Rötuş / Boya İşi", baseEnum: "duvar_tamir" },
  { id: "beyaz_esya_baglanti", emoji: "🧺", label: "Çamaşır/Bulaşık Mak.", baseEnum: "kucuk_tamir" },
  { id: "avize_montaj", emoji: "💡", label: "Avize Montajı", baseEnum: "ampul_takma" },
  { id: "sineklik_montaj", emoji: "🦟", label: "Sineklik Takma", baseEnum: "perde_asma" },
  { id: "bisiklet_tamir", emoji: "🚲", label: "Bisiklet Bakım/Tamir", baseEnum: "kucuk_tamir" },
  { id: "klima_filitre", emoji: "❄️", label: "Klima Filtre Temizlik", baseEnum: "kucuk_tamir" },
  { id: "cesitli_isler", emoji: "✨", label: "Çeşitli Genel İşler", baseEnum: "kucuk_tamir" },
];

// Yardım çağrısı oluşturma ekranındaki aynı emoji ikonları eşleştirir
const baseEnumEmoji: Record<string, string> = {
  ampul_takma: "💡",
  perde_asma: "🪟",
  mobilya_monte: "🪑",
  duvar_tamir: "🔨",
  kucuk_tamir: "🔧",
  tasima_yardimi: "📦",
};

// Akıllı İkon Eşleştirici (Hem Veritabanı Kategorisi Hem İlan Başlığına Bakar)
const getCategoryIcon = (category: string, title?: string) => {
  // Veritabanındaki category ID'sini veya title metnini eşleştir
  const foundSub = SUB_CATEGORIES.find(
    (sub) => sub.id === category || sub.label.toLowerCase() === title?.toLowerCase()
  );

  const matchedId = foundSub ? foundSub.id : category;

  switch (matchedId) {
    case "ampul_takma":
    case "avize_montaj":
      return <Lightbulb className="text-amber-500" size={24} />;
    case "perde_asma":
    case "sineklik_montaj":
      return <Blinds className="text-blue-500" size={24} />;
    case "mobilya_monte":
      return <Armchair className="text-amber-800" size={24} />;
    case "duvar_tamir":
    case "raf_montaj":
      return <Hammer className="text-stone-500" size={24} />;
    case "boya_badana":
      return <Paintbrush className="text-pink-500" size={24} />;
    case "musluk_tamir":
    case "gider_acma":
    case "silikon_cekme":
      return <Droplet className="text-cyan-500" size={24} />;
    case "kapı_kilit":
      return <Key className="text-amber-600" size={24} />;
    case "tasima_yardimi":
    case "esya_tasima":
    case "arac_yukleme":
      return <Package className="text-orange-500" size={24} />;
    case "kurye_paket":
      return <Package className="text-purple-500" size={24} />;
    case "alisveris_teslimat":
      return <ShoppingCart className="text-green-500" size={24} />;
    case "balkon_temizligi":
    case "ev_temizligi":
    case "cam_silme":
    case "hali_yikama":
      return <Sparkles className="text-emerald-500" size={24} />;
    case "utu_yapma":
    case "dolap_duzenleme":
      return <Shirt className="text-indigo-400" size={24} />;
    case "tv_kurulum":
      return <Tv className="text-slate-700" size={24} />;
    case "wifi_internet":
      return <Wifi className="text-blue-600" size={24} />;
    case "bilgisayar_format":
      return <Laptop className="text-indigo-600" size={24} />;
    case "telefon_kurulum":
      return <Smartphone className="text-teal-600" size={24} />;
    case "kablo_duzenleme":
      return <Plug className="text-yellow-600" size={24} />;
    case "kopek_gezdirme":
      return <Dog className="text-amber-700" size={24} />;
    case "kedi_bakimi":
      return <Cat className="text-orange-400" size={24} />;
    case "vet_goturme":
      return <Hospital className="text-red-500" size={24} />;
    case "bahce_sulama":
      return <Sprout className="text-green-500" size={24} />;
    case "cim_bicme":
      return <Scissors className="text-lime-600" size={24} />;
    case "oto_yikama":
      return <Car className="text-blue-500" size={24} />;
    case "aku_takviye":
      return <BatteryCharging className="text-red-600" size={24} />;
    case "yasli_yardim":
    case "refakat":
      return <HeartHandshake className="text-rose-500" size={24} />;
    case "cocuk_oyun":
      return <Baby className="text-sky-400" size={24} />;
    case "ozel_ders":
    case "dil_pratik":
      return <BookOpen className="text-blue-700" size={24} />;
    case "muzik_dersi":
      return <Guitar className="text-purple-600" size={24} />;
    case "fotograf_cekimi":
      return <Camera className="text-slate-800" size={24} />;
    case "parti_hazirlik":
      return <PartyPopper className="text-pink-600" size={24} />;
    case "yemek_hazirlik":
      return <UtensilsCrossed className="text-orange-600" size={24} />;
    case "sira_bekleme":
      return <Hourglass className="text-amber-600" size={24} />;
    case "beyaz_esya_baglanti":
      return <WashingMachine className="text-cyan-600" size={24} />;
    case "bisiklet_tamir":
      return <Bike className="text-green-600" size={24} />;
    case "klima_filitre":
      return <Snowflake className="text-sky-500" size={24} />;
    default:
      return <Wrench className="text-slate-600" size={24} />;
  }
};

// Yayında geçen süre: canlı sayaç
const formatElapsed = (createdAt: string, now: number) => {
  const total = Math.max(0, Math.floor((now - new Date(createdAt).getTime()) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}sa ${String(m).padStart(2, "0")}dk`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

type AcceptedItem = {
  assignment_id: string;
  agreed_price: number | null;
  accepted_at: string;
  task: Tables<"tasks">;
  owner?: { full_name: string; avatar_url: string | null; user_id: string } | null;
};

const MyTasks = () => {
  const [tab, setTab] = useState<"owned" | "accepted">("owned");
  const [tasks, setTasks] = useState<Tables<"tasks">[]>([]);
  const [accepted, setAccepted] = useState<AcceptedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Tables<"tasks"> | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmState, setConfirmState] = useState<
    | { kind: "leave" | "cancel"; taskId: string; title: string; description: string; confirmLabel: string }
    | null
  >(null);

  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [viewers, setViewers] = useState<{ id: string; full_name: string; avatar_url: string | null; viewed_at: string }[]>([]);
  const [, setPriceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPriceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);

    const ownedIds = (data || []).map((t) => t.id);
    if (ownedIds.length > 0) {
      const { data: views } = await supabase
        .from("task_views")
        .select("task_id")
        .in("task_id", ownedIds);
      const counts: Record<string, number> = {};
      (views || []).forEach((v) => { counts[v.task_id] = (counts[v.task_id] || 0) + 1; });
      setViewCounts(counts);
    }
  };

  const fetchAccepted = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("task_assignments")
      .select("id, agreed_price, created_at, tasks(*)")
      .eq("tasker_id", user.id)
      .order("created_at", { ascending: false });

    const items: AcceptedItem[] = (data || [])
      .filter((row: any) => row.tasks)
      .map((row: any) => ({
        assignment_id: row.id,
        agreed_price: row.agreed_price,
        accepted_at: row.created_at,
        task: row.tasks as Tables<"tasks">,
        owner: null,
      }));

    const ownerIds = [...new Set(items.map((i) => i.task.owner_id))];
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ownerIds);
      items.forEach((i) => {
        i.owner = (profiles || []).find((p) => p.user_id === i.task.owner_id) || null;
      });
    }
    setAccepted(items);
  };

  useEffect(() => {
    fetchTasks();
    fetchAccepted();
  }, [user]);

  const handleLeave = async (taskId: string) => {
    if (!user) return;
    setIsUpdating(true);
    const ok = await leaveTask(taskId, user.id);
    setIsUpdating(false);
    setConfirmState(null);
    if (ok) {
      toast.success("İşten ayrıldın.");
      fetchAccepted();
    } else {
      toast.error("İşten ayrılamadın, tekrar dene.");
    }
  };



  // Seçili işin görüntüleyenlerini yükle (sadece iş veren için)
  useEffect(() => {
    if (!selectedTask || !user || selectedTask.owner_id !== user.id) {
      setViewers([]);
      return;
    }
    supabase
      .from("task_views")
      .select("viewer_id, viewed_at")
      .eq("task_id", selectedTask.id)
      .order("viewed_at", { ascending: false })
      .then(async ({ data }) => {
        const ids = (data || []).map((v) => v.viewer_id);
        if (ids.length === 0) { setViewers([]); return; }
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        setViewers(
          (data || []).map((v) => {
            const p = (profiles || []).find((pr) => pr.user_id === v.viewer_id);
            return {
              id: v.viewer_id,
              full_name: p?.full_name || "Kullanıcı",
              avatar_url: p?.avatar_url || null,
              viewed_at: v.viewed_at,
            };
          })
        );
      });
  }, [selectedTask?.id, user?.id]);

  const handleCancelTask = async (taskId: string) => {
    setIsUpdating(true);
    const { error } = await supabase
      .from("tasks")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", taskId);

    if (!error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "cancelled" } : t)));
      setSelectedTask(null);
    } else {
      toast.error("İptal edilemedi, tekrar dene.");
    }
    setIsUpdating(false);
    setConfirmState(null);
  };


  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">İşlerim</h1>
      </div>


      <div className="mx-5 mb-3 flex rounded-2xl bg-muted p-1">
        <button
          onClick={() => setTab("owned")}
          className={`flex-1 rounded-xl py-2 text-xs font-black transition-all ${tab === "owned" ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}
        >
          Yardım Çağrılarım ({tasks.length})
        </button>
        <button
          onClick={() => setTab("accepted")}
          className={`flex-1 rounded-xl py-2 text-xs font-black transition-all ${tab === "accepted" ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}
        >
          El Attıklarım ({accepted.length})
        </button>
      </div>

      <div className="flex-1 px-5 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tab === "accepted" ? (
          accepted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <HeartHandshake size={32} className="text-muted-foreground" />
              </div>
              <p className="mt-3 text-lg font-bold text-foreground">Henüz el attığın iş yok</p>
              <p className="text-xs text-muted-foreground">Haritadan bir yardım çağrısı kabul et.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accepted.map((item, i) => {
                const t = item.task;
                const status = statusLabels[t.status] || statusLabels.open;
                const isDone = t.status === "completed" || t.status === "cancelled";
                return (
                  <motion.div
                    key={item.assignment_id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`rounded-2xl border border-border bg-card p-4 shadow-card ${isDone ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                        {getTaskEmoji(t.category, t.subcategory, t.title)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-foreground">{t.title}</h3>
                        <p className={`text-xs font-semibold ${status.color}`}>{status.label}</p>
                        <button
                          onClick={() => navigate(`/profile/${t.owner_id}`)}
                          className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"
                        >
                          <User size={11} className="text-primary" />
                          {item.owner?.full_name || "İş veren"}
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-primary">
                          {item.agreed_price ?? t.current_price ?? t.price} ₺
                        </p>
                        <span className="text-[10px] text-muted-foreground">Anlaşılan</span>
                      </div>
                    </div>
                    {!isDone && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => navigate(`/task/${t.id}`)}
                          className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"
                        >
                          İşi Aç 💬
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={() =>
                            setConfirmState({
                              kind: "leave",
                              taskId: t.id,
                              title: "İşten ayrılmak üzeresin",
                              description: "Bu yardım çağrısındaki yerini bırakacaksın. Emin misin?",
                              confirmLabel: "Ayrıl",
                            })
                          }

                          className="flex-1 rounded-xl border border-border py-2.5 text-xs font-bold text-muted-foreground disabled:opacity-50"
                        >
                          İşten Ayrıl
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Clock size={32} className="text-muted-foreground" />
            </div>
            <p className="mt-3 text-lg font-bold text-foreground">Henüz yardım çağrın yok</p>
          </div>
        ) : (
          <div className="space-y-3">

            {tasks.map((task, i) => {
              const status = statusLabels[task.status] || statusLabels.open;

              return (
                <motion.div
                  key={task.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedTask(task)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                    {getTaskEmoji(task.category, task.subcategory, task.title)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="truncate text-sm font-bold text-foreground">{task.title}</h3>
                      {task.urgency === "urgent" && (
                        <span className="flex items-center text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">
                          <Zap size={10} className="fill-red-500 mr-0.5" /> Acil
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-semibold ${status.color}`}>{status.label}</p>
                    <div className="mt-1 flex items-center gap-3 text-[10px] font-semibold text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Timer size={11} className="text-primary" />
                        {formatElapsed(task.created_at, Date.now())}
                      </span>
                      {task.owner_id === user?.id && (
                        <span className="flex items-center gap-1">
                          <Eye size={11} className="text-primary" />
                          {viewCounts[task.id] || 0} görüntülenme
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-black text-primary">{computePrice(task).price} ₺</p>
                    {computePrice(task).isDropping && (
                      <p className="text-[10px] font-semibold text-primary">↓ {formatCountdown(computePrice(task).msToNextDrop)}</p>
                    )}
                    <span className="text-[10px] text-muted-foreground">Detay →</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detay Modalı */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-xl border border-border space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTaskEmoji(selectedTask.category, selectedTask.subcategory, selectedTask.title)}</span>
                  <h2 className="text-lg font-bold text-foreground">{selectedTask.title}</h2>
                </div>
                <button onClick={() => setSelectedTask(null)} className="rounded-full p-1 bg-muted hover:bg-muted/80">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-sm text-foreground">
                <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-xs text-muted-foreground font-semibold">Acillik Durumu:</span>
                  {selectedTask.urgency === "urgent" ? (
                    <span className="flex items-center gap-1 font-bold text-xs text-red-600 bg-red-100 px-2.5 py-1 rounded-lg">
                      <Zap size={14} className="fill-red-600" /> Acil (Hemen Lazım)
                    </span>
                  ) : (
                    <span className="font-semibold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      Esnek / Bekleyebilir
                    </span>
                  )}
                </div>

                <div>
                  <span className="font-semibold text-muted-foreground text-xs">Açıklama:</span>
                  <p className="mt-1 text-sm bg-muted/40 p-3 rounded-xl">{selectedTask.description}</p>
                </div>

                {selectedTask.photo_urls && selectedTask.photo_urls.length > 0 && (
                  <div>
                    <span className="font-semibold text-muted-foreground text-xs flex items-center gap-1 mb-1.5">
                      <ImageIcon size={14} /> Eklenen Fotoğraflar ({selectedTask.photo_urls.length})
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedTask.photo_urls.map((url, idx) => (
                        <img 
                          key={idx} 
                          src={url} 
                          alt="İş Görseli" 
                          className="h-20 w-20 object-cover rounded-xl border border-border"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between py-1 border-t pt-2">
                  <span className="text-muted-foreground">Fiyat:</span>
                  <span className="font-bold text-primary">{selectedTask.price} ₺</span>
                </div>

                {/* Yayında geçen süre */}
                <div className="flex justify-between items-center py-1 border-t pt-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Timer size={14} className="text-primary" /> Yayında:
                  </span>
                  <span className="font-bold text-foreground tabular-nums">
                    {formatElapsed(selectedTask.created_at, Date.now())}
                  </span>
                </div>

                {/* Görüntüleyenler (sadece iş veren) */}
                {selectedTask.owner_id === user?.id && (
                  <div className="border-t pt-2">
                    <span className="text-muted-foreground flex items-center gap-1 mb-2">
                      <Eye size={14} className="text-primary" /> Görüntüleyenler ({viewers.length})
                    </span>
                    {viewers.length === 0 ? (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl">
                        Henüz kimse görüntülemedi.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {viewers.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => { setSelectedTask(null); navigate(`/profile/${v.id}`); }}
                            className="flex w-full items-center gap-2.5 rounded-xl bg-muted/40 p-2 text-left hover:bg-muted/70"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted overflow-hidden">
                              {v.avatar_url ? (
                                <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <User size={14} className="text-muted-foreground" />
                              )}
                            </div>
                            <span className="flex-1 text-xs font-bold text-foreground truncate">{v.full_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(v.viewed_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                
                {selectedTask.address_note && (
                  <div className="flex justify-between py-1 border-t pt-2">
                    <span className="text-muted-foreground">Adres Notu:</span>
                    <span className="font-medium text-right max-w-[200px]">{selectedTask.address_note}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                {selectedTask.status === "open" && selectedTask.owner_id === user?.id && (
                  <>
                    <button
                      disabled={isUpdating}
                      onClick={() =>
                        setConfirmState({
                          kind: "cancel",
                          taskId: selectedTask.id,
                          title: "Yardım çağrısını iptal et",
                          description: "Bu çağrı kapatılacak ve haritadan kaldırılacak. Emin misin?",
                          confirmLabel: "İptal Et",
                        })
                      }

                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 text-destructive py-3 font-bold hover:bg-destructive/20"
                    >
                      <Trash2 size={18} />
                      İptal Et
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedTask(null);
                        navigate(`/create-task?edit=${selectedTask.id}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-bold hover:opacity-90"
                    >
                      <Edit3 size={18} />
                      Düzenle
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title || ""}
        description={confirmState?.description}
        confirmLabel={confirmState?.confirmLabel}
        destructive
        loading={isUpdating}
        onCancel={() => setConfirmState(null)}
        onConfirm={() => {
          if (!confirmState) return;
          if (confirmState.kind === "leave") handleLeave(confirmState.taskId);
          else handleCancelTask(confirmState.taskId);
        }}
      />
    </div>
  );
};

export default MyTasks;
