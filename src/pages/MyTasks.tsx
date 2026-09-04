import { useT, translate } from "@/lib/i18n";
import { formatPrice, getTaskCurrency } from "@/lib/currency";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, Clock, Lightbulb, Blinds, Armchair, Hammer, Wrench, Package, 
  Trash2, Edit3, X, Zap, Image as ImageIcon, Sparkles, Droplet, Key, Laptop, 
  Bike, Paintbrush, Utensils, Scissors, Car, Dog, Shirt, Tv, Wifi, Smartphone, 
  Plug, Cat, Hospital, Sprout, BatteryCharging, HeartHandshake, UserCheck, 
  Baby, BookOpen, MessageSquare, Guitar, Camera, PartyPopper, UtensilsCrossed, 
  Hourglass, WashingMachine, Snowflake, HelpCircle, ShoppingCart, Eye, Timer, User, CheckCircle2,
  Calendar, Copy
 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { computePrice, formatCountdown } from "@/lib/dynamicPricing";
import { getTaskEmoji } from "@/lib/taskCategories";
import { formatScheduled } from "@/lib/schedule";
import { leaveTask } from "@/lib/assignments";
import { respondToOffer, type OfferRow } from "@/lib/offers";

import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import ReviewDialog from "@/components/ReviewDialog";
import { usePendingReviews } from "@/hooks/usePendingReviews";
import TaskTimeline from "@/components/TaskTimeline";
import {
  taskStatusLabels as statusLabels,
  getTaskStatusLabel,
  isClosedStatus,
  requestCompletion,
  confirmCompletion,
  cancelTask,
  rejectCompletion,
  markArrival,
  completionUnlockMs,
  confirmDeadlineMs,
  formatRemaining,
} from "@/lib/taskLifecycle";
import { formatDateTime } from "@/lib/dateFormat";
import { getLang } from "@/lib/i18n";

const WAIT_DECISION_WINDOW_MS = 5 * 60 * 1000;
const isWaitDecisionWindowOpen = (waitDeadline?: string | null) =>
  !!waitDeadline && Date.now() >= new Date(waitDeadline).getTime() - WAIT_DECISION_WINDOW_MS;


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
  if (h > 0) return translate("{h}sa {m}dk", { h, m: String(m).padStart(2, "0") });
  return `${m}:${String(s).padStart(2, "0")}`;
};

type AcceptedItem = {
  assignment_id: string;
  agreed_price: number | null;
  accepted_at: string;
  arrived_at?: string | null;
  task: Tables<"tasks">;
  owner?: { full_name: string; avatar_url: string | null; user_id: string } | null;
};

// Gizlilik: işi kabul etmemiş kişilerin adı baş harflerle gösterilir (ör. "M.A.")
const initialsOf = (fullName?: string | null) => {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  return parts.map((p) => p.charAt(0).toLocaleUpperCase("tr-TR") + ".").join(" ");
};

const MyTasks = () => {
  const t = useT();

  const [tab, setTab] = useState<"owned" | "accepted">("owned");
  const [tasks, setTasks] = useState<Tables<"tasks">[]>([]);
  const [accepted, setAccepted] = useState<AcceptedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<{ task: Tables<"tasks">; arrivedAt?: string | null } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [confirmState, setConfirmState] = useState<
    | { kind: "leave" | "cancel" | "reject"; taskId: string; title: string; description: string; confirmLabel: string }
    | null
  >(null);
  const { pending: pendingReviews, refresh: refreshPendingReviews } = usePendingReviews();

  const [viewCounts, setViewCounts] = useState<Record<string, number>>({});
  const [viewers, setViewers] = useState<{ id: string; full_name: string; avatar_url: string | null; viewed_at: string }[]>([]);
  const [ownedArrivals, setOwnedArrivals] = useState<Record<string, string | null>>({});
  const [ownedTaskers, setOwnedTaskers] = useState<Record<string, { user_id: string; full_name: string; avatar_url: string | null }[]>>({});
  const [ownedOffers, setOwnedOffers] = useState<Record<string, OfferRow[]>>({});
  const [offerProfiles, setOfferProfiles] = useState<Record<string, { full_name: string; avatar_url: string | null }>>({});

  const [, setPriceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setPriceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  // Bildirimlerden gelen ?task= derin bağlantısı: ilgili görevin detayını aç
  useEffect(() => {
    const taskId = searchParams.get("task");
    if (!taskId || loading) return;
    // Parametreyi hemen temizle ki detay kapatılınca tekrar açılmasın
    const p = new URLSearchParams(searchParams);
    p.delete("task");
    setSearchParams(p, { replace: true });
    const owned = tasks.find((t) => t.id === taskId);
    if (owned) {
      setTab("owned");
      setSelectedDetail({ task: owned, arrivedAt: ownedArrivals[owned.id] });
      return;
    }
    const taken = accepted.find((a) => a.task.id === taskId);
    if (taken) {
      setTab("accepted");
      setSelectedDetail({ task: taken.task, arrivedAt: taken.arrived_at });
      return;
    }
    // Listede yoksa (ör. süresi dolmuş / farklı sekme) doğrudan çek
    supabase.from("tasks").select("*").eq("id", taskId).maybeSingle().then(({ data }) => {
      if (data) setSelectedDetail({ task: data, arrivedAt: null });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, tasks, accepted, loading]);

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

      const { data: assigns } = await supabase
        .from("task_assignments")
        .select("task_id, arrived_at, tasker_id")
        .in("task_id", ownedIds)
        .eq("status", "accepted");
      const arrivals: Record<string, string | null> = {};
      (assigns || []).forEach((a) => {
        if (!arrivals[a.task_id] || (a.arrived_at && a.arrived_at < (arrivals[a.task_id] as string))) {
          arrivals[a.task_id] = a.arrived_at;
        }
      });
      setOwnedArrivals(arrivals);

      const taskerIds = [...new Set((assigns || []).map((a) => a.tasker_id))];
      if (taskerIds.length > 0) {
        const { data: taskerProfiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", taskerIds);
        const taskerMap: Record<string, { user_id: string; full_name: string; avatar_url: string | null }[]> = {};
        (assigns || []).forEach((a) => {
          const p = (taskerProfiles || []).find((tp) => tp.user_id === a.tasker_id);
          if (p) {
            taskerMap[a.task_id] = taskerMap[a.task_id] || [];
            if (!taskerMap[a.task_id].some((x) => x.user_id === p.user_id)) {
              taskerMap[a.task_id].push(p);
            }
          }
        });
        setOwnedTaskers(taskerMap);
      } else {
        setOwnedTaskers({});
      }

      // Gelen fiyat teklifleri
      const { data: offerRows } = await supabase
        .from("task_offers")
        .select("*")
        .in("task_id", ownedIds)
        .order("created_at", { ascending: true });
      const offerMap: Record<string, OfferRow[]> = {};
      (offerRows || []).forEach((o) => {
        offerMap[o.task_id] = offerMap[o.task_id] || [];
        offerMap[o.task_id].push(o as OfferRow);
      });
      setOwnedOffers(offerMap);

      const offerTaskerIds = [...new Set((offerRows || []).map((o) => o.tasker_id))];
      if (offerTaskerIds.length > 0) {
        const { data: op } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", offerTaskerIds);
        const map: Record<string, { full_name: string; avatar_url: string | null }> = {};
        (op || []).forEach((p) => { map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url }; });
        setOfferProfiles(map);
      }
    }
  };

  const handleRespondOffer = async (offerId: string, accept: boolean) => {
    setIsUpdating(true);
    const res = await respondToOffer(offerId, accept);
    setIsUpdating(false);
    if (res === "accepted") toast.success(t("Teklif kabul edildi. El atanın onayı bekleniyor."));
    else if (res === "rejected") toast.success(t("Teklif reddedildi."));
    else if (res === "quota_full") toast.error(t("Kontenjan doldu, başka teklif kabul edemezsin."));
    else toast.error(t("İşlem yapılamadı."));
    await fetchTasks();
  };


  const fetchAccepted = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("task_assignments")
      .select("id, agreed_price, created_at, arrived_at, tasks(*)")
      .eq("tasker_id", user.id)
      .order("created_at", { ascending: false });

    const items: AcceptedItem[] = (data || [])
      .filter((row: any) => row.tasks)
      .map((row: any) => ({
        assignment_id: row.id,
        agreed_price: row.agreed_price,
        accepted_at: row.created_at,
        arrived_at: row.arrived_at ?? null,
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
    refreshPendingReviews();
  }, [user, refreshPendingReviews]);

  const handleLeave = async (taskId: string) => {
    if (!user) return;
    setIsUpdating(true);
    const ok = await leaveTask(taskId, user.id);
    setIsUpdating(false);
    setConfirmState(null);
    if (ok) {
      toast.success(t("İşten ayrıldın."));
      fetchAccepted();
    } else {
      toast.error(t("İşten ayrılamadın, tekrar dene."));
    }
  };

  const handleRequestCompletion = async (taskId: string) => {
    if (!user) return;
    setIsUpdating(true);
    const res = await requestCompletion(taskId);
    setIsUpdating(false);
    if (res.ok) {
      toast.success(res.message);
      await fetchAccepted();
    } else {
      toast.error(res.message);
    }
  };

  const handleMarkArrival = async (item: AcceptedItem) => {
    setIsUpdating(true);
    const res = await markArrival(item.task.id, item.task.latitude, item.task.longitude);
    setIsUpdating(false);
    if (res.ok) {
      toast.success(res.message);
      await fetchAccepted();
    } else {
      toast.error(res.message);
    }
  };

  const handleRejectCompletion = async (taskId: string) => {
    setIsUpdating(true);
    const res = await rejectCompletion(taskId);
    setIsUpdating(false);
    setConfirmState(null);
    if (res.ok) {
      toast.success(res.message);
      setSelectedDetail(null);
      await fetchTasks();
      await fetchAccepted();
    } else {
      toast.error(res.message);
    }
  };


  const handleConfirmCompletion = async (taskId: string) => {
    setIsUpdating(true);
    const ok = await confirmCompletion(taskId);
    setIsUpdating(false);
    if (ok) {
      toast.success(t("Yardım çağrısı tamamlandı."));
      setSelectedDetail(null);
      await fetchTasks();
      refreshPendingReviews();
    } else {
      toast.error(t("İş tamamlanamadı, tekrar dene."));
    }
  };



  // Seçili işin görüntüleyenlerini yükle (sadece iş veren için)
  useEffect(() => {
    if (!selectedDetail?.task || !user || selectedDetail.task.owner_id !== user.id) {
      setViewers([]);
      return;
    }
    supabase
      .from("task_views")
      .select("viewer_id, viewed_at")
      .eq("task_id", selectedDetail.task.id)
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
              full_name: p?.full_name || t("Kullanıcı"),
              avatar_url: p?.avatar_url || null,
              viewed_at: v.viewed_at,
            };
          })
        );
      });
  }, [selectedDetail?.task.id, user?.id]);

  const handleCancelTask = async (taskId: string) => {
    setIsUpdating(true);
    const ok = await cancelTask(taskId);

    if (ok) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "cancelled" } : t)));
      setSelectedDetail(null);
    } else {
      toast.error(t("İptal edilemedi, tekrar dene."));
    }
    setIsUpdating(false);
    setConfirmState(null);
  };

  const handleStartPartial = async (taskId: string) => {
    setIsUpdating(true);
    const { error } = await supabase.rpc("start_task_with_partial_quota", { p_task_id: taskId });
    if (error) {
      toast.error(t("İş başlatılamadı, tekrar dene."));
    } else {
      toast.success(t("İş mevcut kontenjanla başlatıldı."));
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "matched" } : t)));
    }
    setIsUpdating(false);
  };

  const handleCancelUnfilled = async (taskId: string) => {
    setIsUpdating(true);
    const { error } = await supabase.rpc("cancel_unfilled_task", { p_task_id: taskId });
    if (error) {
      toast.error(t("İptal edilemedi, tekrar dene."));
    } else {
      toast.success(t("Görev iptal edildi, el atanlara kredi iadesi yapıldı."));
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "cancelled" } : t)));
    }
    setIsUpdating(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">{t("İşlerim")}</h1>
      </div>


      <div className="mx-5 mb-3 flex rounded-2xl bg-muted p-1">
        <button
          onClick={() => setTab("owned")}
          className={`flex-1 rounded-xl py-2 text-xs font-black transition-all ${tab === "owned" ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}
        >
          {t("Yardım Çağrılarım")} ({tasks.length})
        </button>
        <button
          onClick={() => setTab("accepted")}
          className={`flex-1 rounded-xl py-2 text-xs font-black transition-all ${tab === "accepted" ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}
        >
          {t("El Attıklarım")} ({accepted.length})
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
              <p className="mt-3 text-lg font-bold text-foreground">{t("Henüz el attığın iş yok")}</p>
              <p className="text-xs text-muted-foreground">{t("Haritadan bir yardım çağrısı kabul et.")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accepted.map((item, i) => {
                const task = item.task;
                const status = { ...(statusLabels[task.status] || statusLabels.open), label: getTaskStatusLabel(task.status) };
                const isDone = isClosedStatus(task.status);
                const isMyCompletionRequest =
                  task.status === "pending_confirm" && task.completion_requested_by === user?.id;
                return (
                  <motion.div
                    key={item.assignment_id}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedDetail({ task, arrivedAt: item.arrived_at })}
                    className={`cursor-pointer rounded-2xl border border-border bg-card p-4 shadow-card ${isDone ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                        {getTaskEmoji(task.category, task.subcategory, task.title)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-bold text-foreground">{t(task.title)}</h3>
                        <p className={`text-xs font-semibold ${status.color}`}>{status.label}</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${task.owner_id}`); }}
                          className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground"
                        >
                          <User size={11} className="text-primary" />
                          {item.owner?.full_name || t("İş veren")}
                        </button>
                        <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                          <Calendar size={11} className="text-primary" />
                          {formatDateTime(item.accepted_at)}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-primary">
                          {formatPrice(item.agreed_price ?? task.current_price ?? task.price, getTaskCurrency(task))}
                        </p>
                        <span className="text-[10px] text-muted-foreground">{t("Anlaşılan")}</span>
                      </div>
                    </div>

                    {task.status === "pending_confirm" && (
                      <p className="mt-3 rounded-xl bg-muted/60 p-2.5 text-xs font-semibold text-muted-foreground">
                        {isMyCompletionRequest
                          ? t("El atan bitirdiğini belirtti, sizden onay bekliyor. 24 saat içinde otomatik tamamlanır.")
                          : `${t("İşi tamamlamak için kalan süre:")} ${formatRemaining(confirmDeadlineMs(task.completion_requested_at))}`}
                      </p>
                    )}
                    {!isDone && task.status !== "pending_confirm" && (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/task/${task.id}`); }}
                          className="flex-1 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground"
                        >
                          {t("İşi Aç 💬")}
                        </button>
                        {!item.arrived_at ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleMarkArrival(item); }}
                            disabled={isUpdating}
                            className="flex-1 rounded-xl bg-accent py-2.5 text-xs font-bold text-accent-foreground disabled:opacity-50"
                          >
                            <User size={14} className="mr-1 inline" /> {t("Vardım")}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRequestCompletion(task.id); }}
                            disabled={isUpdating || (completionUnlockMs(item.arrived_at, task.estimated_minutes) ?? 0) > 0}
                            className="flex-1 rounded-xl bg-accent py-2.5 text-xs font-bold text-accent-foreground disabled:opacity-50"
                          >
                            <CheckCircle2 size={14} className="mr-1 inline" />
                            {(completionUnlockMs(item.arrived_at, task.estimated_minutes) ?? 0) > 0
                              ? formatRemaining(completionUnlockMs(item.arrived_at, task.estimated_minutes) ?? 0)
                              : t("Bitirdim")}
                          </button>
                        )}
                      </div>
                    )}
                    {!isDone && task.status !== "pending_confirm" && !item.arrived_at && (
                      <p className="mt-2 text-[10px] text-muted-foreground">{t('İş konumuna 300 m yaklaşınca "Vardım" de; "Bitirdim" bundan sonra açılır.')}</p>
                    )}
                    {task.rejection_count ? (
                      <p className="mt-2 rounded-xl bg-destructive/10 p-2 text-[10px] font-semibold text-destructive">
                        {t("İş veren itiraz etti ({rejection_count}/2). Tamamlayıp tekrar bildir.", { rejection_count: task.rejection_count })}
                      </p>
                    ) : null}

                    {!isDone && task.status === "pending_confirm" && !isMyCompletionRequest && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleConfirmCompletion(task.id); }}
                        disabled={isUpdating}
                        className="mt-3 w-full rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                      >
                        <CheckCircle2 size={14} className="mr-1 inline" /> {t("İşi Onayla ve Tamamla")}
                      </button>
                    )}
                    {!isDone && task.status !== "pending_confirm" && (
                      <button
                        disabled={isUpdating}
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmState({
                            kind: "leave",
                            taskId: task.id,
                            title: t("İşten ayrılmak üzeresin"),
                            description: t("Bu yardım çağrısındaki yerini bırakacaksın. Emin misin?"),
                            confirmLabel: t("Ayrıl"),
                          });
                        }}
                        className="mt-2 w-full rounded-xl border border-border py-2.5 text-xs font-bold text-muted-foreground disabled:opacity-50"
                      >
                        {t("İşten Ayrıl")}
                      </button>
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
            <p className="mt-3 text-lg font-bold text-foreground">{t("Henüz yardım çağrın yok")}</p>
          </div>
        ) : (
          <div className="space-y-3">

            {tasks.map((task, i) => {
              const status = { ...(statusLabels[task.status] || statusLabels.open), label: getTaskStatusLabel(task.status) };
              const isFaded = isClosedStatus(task.status);

              return (
                <motion.div
                  key={task.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: isFaded ? 0.5 : 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedDetail({ task, arrivedAt: ownedArrivals[task.id] })}
                  className={`cursor-pointer rounded-2xl border border-border p-4 shadow-card transition-colors ${
                    isFaded ? "bg-muted/40 grayscale hover:opacity-80" : "bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl">
                      {getTaskEmoji(task.category, task.subcategory, task.title)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="truncate text-sm font-bold text-foreground">{t(task.title)}</h3>
                        {task.urgency === "urgent" && (
                          <span className="flex items-center text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">
                            <Zap size={10} className="fill-red-500 mr-0.5" /> {t("Acil")}
                          </span>
                        )}
                        {task.urgency !== "urgent" && formatScheduled((task as any).scheduled_at) && (
                          <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
                            📅 {formatScheduled((task as any).scheduled_at)}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs font-semibold ${status.color}`}>{status.label}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-base font-black text-primary">{formatPrice(computePrice(task).price, getTaskCurrency(task))}</p>
                      {computePrice(task).isDropping && (
                        <p className="text-[10px] font-semibold text-primary">↓ {formatCountdown(computePrice(task).msToNextDrop)}</p>
                      )}
                      <span className="text-[10px] text-muted-foreground">{t("Detayları Gör")} →</span>
                    </div>
                  </div>

                  {(ownedTaskers[task.id] || []).length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">
                        {t("El atan:")}
                      </span>
                      <div className="flex -space-x-1.5">
                        {(ownedTaskers[task.id] || []).slice(0, 3).map((tp) => (
                          <button
                            key={tp.user_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/profile/${tp.user_id}`);
                            }}
                            className="relative inline-block h-6 w-6 rounded-full border-2 border-card overflow-hidden"
                            title={tp.full_name}
                          >
                            {tp.avatar_url ? (
                              <img src={tp.avatar_url} alt={tp.full_name} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-primary/20 text-primary">
                                <User size={12} />
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const first = (ownedTaskers[task.id] || [])[0];
                          if (first) navigate(`/profile/${first.user_id}`);
                        }}
                        className="text-[11px] font-bold text-primary truncate"
                      >
                        {(ownedTaskers[task.id] || []).slice(0, 2).map((tp) => tp.full_name).join(", ")}
                        {(ownedTaskers[task.id] || []).length > 2 &&
                          ` +${(ownedTaskers[task.id] || []).length - 2}`}
                      </button>
                    </div>
                  )}


                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} className="text-primary" />
                      {formatDateTime(task.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Timer size={11} className="text-primary" />
                      {task.status === "open" ? `${t("Yayında:")} ${formatElapsed(task.created_at, Date.now())}` : ""}
                    </span>
                    {task.status === "pending_confirm" && (
                      <span className="flex items-center gap-1">
                        {t("El atan bitirdi, onay için")} {formatRemaining(confirmDeadlineMs(task.completion_requested_at))}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye size={11} className="text-primary" />
                      {viewCounts[task.id] || 0} {t("görüntülenme")}
                    </span>
                  </div>

                  {task.status === "open" &&
                    (task.person_count || 1) > 1 &&
                    isWaitDecisionWindowOpen(task.wait_deadline) && (
                      <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleCancelUnfilled(task.id)}
                          disabled={isUpdating}
                          className="flex-1 rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground disabled:opacity-50"
                        >
                          {t("Vazgeç")}
                        </button>
                        <button
                          onClick={() => handleStartPartial(task.id)}
                          disabled={isUpdating}
                          className="gradient-warm flex-1 rounded-xl px-4 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50"
                        >
                          {t("İşi Başlat ({filled}/{total})", { filled: (ownedTaskers[task.id] || []).length, total: task.person_count || 0 })}
                        </button>
                      </div>
                    )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detay Modalı */}
      <AnimatePresence>
        {selectedDetail && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-xl border border-border space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getTaskEmoji(selectedDetail.task.category, selectedDetail.task.subcategory, selectedDetail.task.title)}</span>
                  <h2 className="text-lg font-bold text-foreground">{t(selectedDetail.task.title)}</h2>
                </div>
                <button onClick={() => setSelectedDetail(null)} className="rounded-full p-1 bg-muted hover:bg-muted/80">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 text-sm text-foreground">
                <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-xl">
                  <span className="text-xs text-muted-foreground font-semibold">{t("Acillik Durumu:")}</span>
                  {selectedDetail.task.urgency === "urgent" ? (
                    <span className="flex items-center gap-1 font-bold text-xs text-red-600 bg-red-100 px-2.5 py-1 rounded-lg">
                      <Zap size={14} className="fill-red-600" /> {t("Acil (Hemen Lazım)")}
                    </span>
                  ) : (
                    <span className="font-semibold text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {t("Esnek / Bekleyebilir")}
                    </span>
                  )}
                </div>

                {selectedDetail.task.urgency !== "urgent" &&
                  formatScheduled((selectedDetail.task as any).scheduled_at) && (
                    <div className="flex justify-between items-center bg-muted/30 p-2.5 rounded-xl">
                      <span className="text-xs text-muted-foreground font-semibold">{t("Randevu:")}</span>
                      <span className="font-bold text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg">
                        📅 {formatScheduled((selectedDetail.task as any).scheduled_at)}
                      </span>
                    </div>
                  )}

                <div>
                  <span className="font-semibold text-muted-foreground text-xs">{t("Açıklama:")}</span>
                  <p className="mt-1 text-sm bg-muted/40 p-3 rounded-xl">{selectedDetail.task.description}</p>
                </div>


                {selectedDetail.task.photo_urls && selectedDetail.task.photo_urls.length > 0 && (
                  <div>
                    <span className="font-semibold text-muted-foreground text-xs flex items-center gap-1 mb-1.5">
                      <ImageIcon size={14} /> {t("Eklenen Fotoğraflar")} ({selectedDetail.task.photo_urls.length})
                    </span>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedDetail.task.photo_urls.map((url, idx) => (
                        <img 
                          key={idx} 
                          src={url} 
                          alt={t("İş Görseli")} 
                          className="h-20 w-20 object-cover rounded-xl border border-border"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between py-1 border-t pt-2">
                  <span className="text-muted-foreground">{t("Fiyat:")}</span>
                  <span className="font-bold text-primary">{formatPrice(selectedDetail.task.price, getTaskCurrency(selectedDetail.task))}</span>
                </div>

                {/* Yayında geçen süre */}
                <div className="flex justify-between items-center py-1 border-t pt-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Timer size={14} className="text-primary" /> {t("Yayında:")}
                  </span>
                  <span className="font-bold text-foreground tabular-nums">
                    {formatElapsed(selectedDetail.task.created_at, Date.now())}
                  </span>
                </div>

                {/* İş akışı zaman çizelgesi */}
                <div className="border-t pt-2">
                  <span className="text-muted-foreground text-xs font-semibold">{t("İş Akışı:")}</span>
                  <TaskTimeline task={selectedDetail.task} arrivedAt={selectedDetail.arrivedAt} />
                </div>



                {/* Görüntüleyenler (sadece iş veren) */}
                {selectedDetail.task.owner_id === user?.id && (
                  <div className="border-t pt-2">
                    <span className="text-muted-foreground flex items-center gap-1 mb-2">
                      <Eye size={14} className="text-primary" /> {t("Görüntüleyenler")} ({viewers.length})
                    </span>
                    {viewers.length === 0 ? (
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-xl">
                        {t("Henüz kimse görüntülemedi.")}
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto">
                        {viewers.map((v) => {
                          const isAccepted = (ownedTaskers[selectedDetail.task.id] || []).some(
                            (tp) => tp.user_id === v.id
                          );
                          return (
                          <button
                            key={v.id}
                            onClick={() => { setSelectedDetail(null); navigate(`/profile/${v.id}`); }}
                            className="flex w-full items-center gap-2.5 rounded-xl bg-muted/40 p-2 text-left hover:bg-muted/70"
                          >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted overflow-hidden">
                              {v.avatar_url ? (
                                <img src={v.avatar_url} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <User size={14} className="text-muted-foreground" />
                )}
              </div>
                            <span className="flex-1 text-xs font-bold text-foreground truncate">
                              {isAccepted ? v.full_name : initialsOf(v.full_name)}
                            </span>

                            <span className="text-[10px] text-muted-foreground">
                              {new Date(v.viewed_at).toLocaleTimeString(getLang() === "en" ? "en-US" : "tr-TR", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* İşi kabul edenler (sadece iş veren) */}
                {selectedDetail.task.owner_id === user?.id && (ownedTaskers[selectedDetail.task.id] || []).length > 0 && (
                  <div className="border-t pt-2">
                    <span className="text-muted-foreground text-xs font-semibold flex items-center gap-1 mb-2">
                      <UserCheck size={14} className="text-primary" /> {t("İşi Kabul Eden / El Atan")}
                    </span>
                    <div className="space-y-1.5">
                      {(ownedTaskers[selectedDetail.task.id] || []).map((tp) => (
                        <button
                          key={tp.user_id}
                          onClick={() => { setSelectedDetail(null); navigate(`/profile/${tp.user_id}`); }}
                          className="flex w-full items-center gap-2.5 rounded-xl bg-muted/40 p-2 text-left hover:bg-muted/70"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted overflow-hidden">
                            {tp.avatar_url ? (
                              <img src={tp.avatar_url} alt={tp.full_name} className="h-full w-full object-cover" />
                            ) : (
                              <User size={14} className="text-muted-foreground" />
                            )}
                          </div>
                          <span className="flex-1 text-xs font-bold text-foreground truncate">{tp.full_name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDetail.task.address_note && (

                  <div className="flex justify-between py-1 border-t pt-2">
                    <span className="text-muted-foreground">{t("Adres Notu:")}</span>
                    <span className="font-medium text-right max-w-[200px]">{selectedDetail.task.address_note}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-3">
                {(selectedDetail.task.status === "completed" || selectedDetail.task.status === "cancelled") &&
                  selectedDetail.task.owner_id === user?.id && (
                    <button
                      onClick={() => {
                        setSelectedDetail(null);
                        navigate(`/create-task?duplicate=${selectedDetail.task.id}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-bold hover:opacity-90"
                    >
                      <Copy size={18} />
                      {t("Tekrar Oluştur")}
                    </button>
                  )}

                {selectedDetail.task.status === "pending_confirm" && selectedDetail.task.owner_id === user?.id && (
                  <>
                    <button
                      onClick={() => handleConfirmCompletion(selectedDetail.task.id)}
                      disabled={isUpdating}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-bold disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} />
                      {t("Onayla")}
                    </button>
                    <button
                      onClick={() =>
                        setConfirmState({
                          kind: "reject",
                          taskId: selectedDetail.task.id,
                          title: t("İş yapılmadı mı?"),
                          description:
                            (selectedDetail.task.rejection_count ?? 0) >= 1
                              ? t("Bu ikinci itirazın. Anlaşmazlık olarak değerlendirilecek ve varış kaydına göre tarafsız sonuçlandırılacak.")
                              : t("El atan kişiye bildirilecek, işi tamamlayıp tekrar bildirebilecek. Haksız itirazlar sicilinize işlenir."),
                          confirmLabel: t("İtiraz Et"),
                        })
                      }
                      disabled={isUpdating}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 text-destructive py-3 font-bold disabled:opacity-50"
                    >
                      <X size={18} />
                      {t("İş Yapılmadı")}
                    </button>
                  </>
                )}

                {selectedDetail.task.status === "open" &&
                  selectedDetail.task.owner_id === user?.id &&
                  (selectedDetail.task.person_count || 1) > 1 &&
                  isWaitDecisionWindowOpen(selectedDetail.task.wait_deadline) && (
                    <>
                      <button
                        disabled={isUpdating}
                        onClick={() => handleCancelUnfilled(selectedDetail.task.id)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 text-destructive py-3 font-bold hover:bg-destructive/20 disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                        {t("Vazgeç")}
                      </button>
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStartPartial(selectedDetail.task.id)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-bold hover:opacity-90 disabled:opacity-50"
                      >
                        <UserCheck size={18} />
                        {t("İşi Başlat")}
                      </button>
                    </>
                  )}

                {selectedDetail.task.status === "open" &&
                  selectedDetail.task.owner_id === user?.id &&
                  !(
                    (selectedDetail.task.person_count || 1) > 1 &&
                    isWaitDecisionWindowOpen(selectedDetail.task.wait_deadline)
                  ) && (
                    <>
                      <button
                        disabled={isUpdating}
                        onClick={() =>
                          setConfirmState({
                            kind: "cancel",
                            taskId: selectedDetail.task.id,
                            title: t("Yardım çağrısını iptal et"),
                            description: t("Bu çağrı kapatılacak ve haritadan kaldırılacak. Emin misin?"),
                            confirmLabel: t("İptal Et"),
                          })
                        }

                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 text-destructive py-3 font-bold hover:bg-destructive/20"
                      >
                        <Trash2 size={18} />
                        {t("İptal Et")}
                      </button>

                      <button
                        onClick={() => {
                          setSelectedDetail(null);
                          navigate(`/create-task?edit=${selectedDetail.task.id}`);
                        }}
                        className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-bold hover:opacity-90"
                      >
                        <Edit3 size={18} />
                        {t("Düzenle")}
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
          else if (confirmState.kind === "reject") handleRejectCompletion(confirmState.taskId);
          else handleCancelTask(confirmState.taskId);
        }}
      />

      <ReviewDialog
        review={pendingReviews[0] || null}
        onDone={async () => { await refreshPendingReviews(); }}
      />
    </div>
  );
};

export default MyTasks;
