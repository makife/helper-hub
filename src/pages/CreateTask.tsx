import { useT } from "@/lib/i18n";
import { CURRENCIES, CURRENCY_LABELS, currencySymbol, formatPrice, type CurrencyCode } from "@/lib/currency";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, Flame, Clock, X, Edit3, Grid, Users, Image as ImageIcon, Search as SearchIcon, Wrench, Check, Plus, UserCheck, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ALL_TASK_CATEGORIES, type TaskBaseCategory } from "@/lib/taskCategories";
import { ALL_TOOLS, TOOL_GROUPS } from "@/lib/toolsList";

const PERSON_OPTIONS = [
  { value: 1, label: "1 Kişi" },
  { value: 2, label: "2 Kişi" },
  { value: 3, label: "3 Kişi" },
];

const WAIT_TIME_OPTIONS = [
  { label: "1 saat", minutes: 60 },
  { label: "2 saat", minutes: 120 },
  { label: "3 saat", minutes: 180 },
  { label: "Çağrı kapanana kadar (6 saat)", minutes: 360 },
];

const categories = ALL_TASK_CATEGORIES;

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();

// Hazır süre seçenekleri (dakika cinsinden)
const durationPresets = [
  { label: "30 dk", minutes: 30 },
  { label: "1 saat", minutes: 60 },
  { label: "2 saat", minutes: 120 },
  { label: "4 saat", minutes: 240 },
  { label: "Tüm Gün", minutes: 480 },
];

const CreateTask = () => {
  const t = useT();
  const [searchParams] = useSearchParams();
  const editTaskId = searchParams.get("edit");
  const duplicateTaskId = searchParams.get("duplicate");

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryQuery, setCategoryQuery] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState("");

  const [description, setDescription] = useState("");
  const [personCount, setPersonCount] = useState<number>(1);
  const [isCustomPersonCount, setIsCustomPersonCount] = useState(false);
  const [customPersonCountInput, setCustomPersonCountInput] = useState("");
  const [waitMinutes, setWaitMinutes] = useState<number>(60);
  const [basePriceInput, setBasePriceInput] = useState<string>("200");
  const [currency, setCurrency] = useState<CurrencyCode>("TRY");
  const basePrice = Number(basePriceInput) || 0;
  const [duration, setDuration] = useState(30);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [customDurationHours, setCustomDurationHours] = useState<string>("");
  const [urgency, setUrgency] = useState<"urgent" | "can_wait">("can_wait");
  const [addressNote, setAddressNote] = useState("");
  const [originalLat, setOriginalLat] = useState<number | null>(null);
  const [originalLng, setOriginalLng] = useState<number | null>(null);

  // Alet-Edevat
  const [needsTools, setNeedsTools] = useState(false);
  const [toolProvider, setToolProvider] = useState<"helper" | "owner">("helper");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [toolQuery, setToolQuery] = useState("");
  const [customTools, setCustomTools] = useState<string[]>([]);
  const [customToolInput, setCustomToolInput] = useState("");

  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  const totalPrice = basePrice * personCount;

  useEffect(() => {
    if (!editTaskId) return;

    const loadTaskData = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", editTaskId)
        .single();

      if (data && !error) {
        setDescription(data.description || "");
        setBasePriceInput(String(data.price ? Math.round(data.price / (data.person_count || 1)) : 200));
        setCurrency((data.currency as CurrencyCode) || "TRY");
        const loadedPersonCount = data.person_count || 1;
        setPersonCount(loadedPersonCount);
        if (!PERSON_OPTIONS.some((p) => p.value === loadedPersonCount)) {
          setIsCustomPersonCount(true);
          setCustomPersonCountInput(String(loadedPersonCount));
        }
        setWaitMinutes(data.wait_minutes || 60);
        const loadedMinutes = data.estimated_minutes || 30;
        setDuration(loadedMinutes);
        if (!durationPresets.some((p) => p.minutes === loadedMinutes)) {
          setIsCustomDuration(true);
          setCustomDurationHours(String(Math.round((loadedMinutes / 60) * 10) / 10));
        }
        setUrgency((data.urgency as "urgent" | "can_wait") || "can_wait");
        setAddressNote(data.address_note || "");
        setOriginalLat(data.latitude ?? null);
        setOriginalLng(data.longitude ?? null);
        setNeedsTools(Boolean(data.needs_tools));
        setToolProvider((data.tool_provider as "helper" | "owner") || "helper");
        setSelectedTools(data.required_tools || []);
        setCustomTools(data.custom_tools || []);
        setExistingPhotoUrls(data.photo_urls || []);
        setPhotoPreviews(data.photo_urls || []);

        const matchedCat = categories.find(
          (category) => category.id === data.subcategory || category.label === data.title,
        );
        if (matchedCat) {
          setSelectedCategoryId(matchedCat.id);
          setIsCustomCategory(false);
        } else {
          setIsCustomCategory(true);
          setCustomCategoryText(data.title || "");
        }
      }
    };

    loadTaskData();
  }, [editTaskId]);

  // "Tekrar Oluştur": tamamlanmış/iptal bir görevin bilgilerini yeni bir
  // görev taslağı olarak önceden doldurur. Edit'ten farkı: konum yeniden
  // GPS'ten alınır (originalLat set edilmez) ve eski fotoğraflar taşınmaz.
  useEffect(() => {
    if (!duplicateTaskId) return;

    const loadDuplicateData = async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", duplicateTaskId)
        .single();

      if (data && !error) {
        setDescription(data.description || "");
        setBasePriceInput(String(data.price ? Math.round(data.price / (data.person_count || 1)) : 200));
        setCurrency((data.currency as CurrencyCode) || "TRY");
        const loadedPersonCount = data.person_count || 1;
        setPersonCount(loadedPersonCount);
        if (!PERSON_OPTIONS.some((p) => p.value === loadedPersonCount)) {
          setIsCustomPersonCount(true);
          setCustomPersonCountInput(String(loadedPersonCount));
        }
        setWaitMinutes(data.wait_minutes || 60);
        const loadedMinutes = data.estimated_minutes || 30;
        setDuration(loadedMinutes);
        if (!durationPresets.some((p) => p.minutes === loadedMinutes)) {
          setIsCustomDuration(true);
          setCustomDurationHours(String(Math.round((loadedMinutes / 60) * 10) / 10));
        }
        setUrgency((data.urgency as "urgent" | "can_wait") || "can_wait");
        setAddressNote(data.address_note || "");
        setNeedsTools(Boolean(data.needs_tools));
        setToolProvider((data.tool_provider as "helper" | "owner") || "helper");
        setSelectedTools(data.required_tools || []);
        setCustomTools(data.custom_tools || []);

        const matchedCat = categories.find(
          (category) => category.id === data.subcategory || category.label === data.title,
        );
        if (matchedCat) {
          setSelectedCategoryId(matchedCat.id);
          setIsCustomCategory(false);
        } else {
          setIsCustomCategory(true);
          setCustomCategoryText(data.title || "");
        }
        toast.info(t("Önceki görevin bilgileriyle dolduruldu, gözden geçirip yayınlayabilirsin."));
      }
    };

    loadDuplicateData();
  }, [duplicateTaskId]);

  const addPhoto = (source: "camera" | "gallery") => {
    if (photoPreviews.length >= 2) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "environment");
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setPhotos((prev) => [...prev, file]);
        setPhotoPreviews((prev) => [...prev, URL.createObjectURL(file)]);
      }
    };
    input.click();
  };


  const removePhoto = (index: number) => {
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setExistingPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleTool = (toolId: string) => {
    setSelectedTools((prev) =>
      prev.includes(toolId) ? prev.filter((id) => id !== toolId) : [...prev, toolId]
    );
  };

  const addCustomTool = () => {
    const value = customToolInput.trim();
    if (!value) return;
    if (customTools.some((t) => normalize(t) === normalize(value))) {
      setCustomToolInput("");
      return;
    }
    setCustomTools((prev) => [...prev, value]);
    setCustomToolInput("");
  };

  const removeCustomTool = (index: number) => {
    setCustomTools((prev) => prev.filter((_, i) => i !== index));
  };

  const isValidCategory = isCustomCategory
    ? customCategoryText.trim().length >= 3
    : Boolean(selectedCategoryId);

  const isValidDuration = !isCustomDuration || (parseFloat(customDurationHours) > 0);
  const isValidPersonCount = !isCustomPersonCount || (parseInt(customPersonCountInput, 10) > 0);
  const isValidTools = !needsTools || selectedTools.length + customTools.length > 0;

  const isValid =
    isValidCategory &&
    description.length >= 20 &&
    totalPrice >= 50 &&
    isValidDuration &&
    isValidPersonCount &&
    isValidTools;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isValid) return;

    setLoading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.name.split(".").pop();
        const path = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const { error } = await supabase.storage.from("task-photos").upload(path, photo);
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from("task-photos").getPublicUrl(path);
          uploadedUrls.push(publicUrl);
        }
      }

      const finalPhotoUrls = [...existingPhotoUrls, ...uploadedUrls];
      const selectedCatObj = categories.find((c) => c.id === selectedCategoryId);
      const taskTitle = isCustomCategory
        ? customCategoryText.trim()
        : selectedCatObj?.label || "Yardım Çağrısı";

      const enumCategory: TaskBaseCategory = isCustomCategory
        ? "kucuk_tamir"
        : selectedCatObj?.baseEnum || "kucuk_tamir";

      const safeTotalPrice = Math.max(50, totalPrice);
      const safeMinPrice = urgency === "can_wait" ? Math.max(50, Math.round(safeTotalPrice * 0.65)) : safeTotalPrice;

      let latitude: number | null = null;
      let longitude: number | null = null;

      if (editTaskId && originalLat != null && originalLng != null) {
        // Düzenleme modunda konum sessizce değişmesin diye görevin
        // mevcut konumu korunur; kullanıcı sadece açıklama/fiyat gibi
        // alanları güncelliyor olabilir, o an nerede olduğu görevin
        // konumunu etkilememeli.
        latitude = originalLat;
        longitude = originalLng;
      } else {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 })
          );
          latitude = pos.coords.latitude;
          longitude = pos.coords.longitude;
        } catch {
          // Konum izni yoksa profildeki kayıtlı konuma düş
          const { data: profile } = await supabase
            .from("profiles")
            .select("latitude, longitude")
            .eq("user_id", user.id)
            .maybeSingle();
          latitude = profile?.latitude ?? null;
          longitude = profile?.longitude ?? null;
        }
      }

      if (latitude == null || longitude == null) {
        setLoading(false);
        toast.error(t("Konum alınamadı. Lütfen konum izni verip tekrar dene."));
        return;
      }

      const taskPayload = {
        owner_id: user.id,
        title: taskTitle,
        description,
        category: enumCategory as any,
        subcategory: isCustomCategory ? null : selectedCategoryId,
        urgency,
        currency,
        price: safeTotalPrice,
        current_price: safeTotalPrice,
        min_price: safeMinPrice,
        person_count: personCount,
        wait_minutes: personCount > 1 ? waitMinutes : null,
        estimated_minutes: duration,
        address_note: addressNote || null,
        needs_tools: needsTools,
        tool_provider: needsTools ? toolProvider : null,
        required_tools: needsTools ? selectedTools : [],
        custom_tools: needsTools ? customTools : [],
        photo_urls: finalPhotoUrls,
        latitude,
        longitude,
        price_drop_started_at:
          urgency === "can_wait" && personCount === 1 ? new Date().toISOString() : null,
      };

      let error;
      let newTaskId: string | null = null;
      if (editTaskId) {
        const res = await supabase.from("tasks").update(taskPayload).eq("id", editTaskId);
        error = res.error;
      } else {
        const res = await supabase.from("tasks").insert(taskPayload).select("id").single();
        error = res.error;
        newTaskId = res.data?.id ?? null;
      }

      setLoading(false);

      if (error) {
        if (!editTaskId && error.message?.includes("Yetersiz kredi")) {
          toast.error(t("Yetersiz kredi! Yardım çağrısı oluşturmak için 1 kredi gerekli."), {
            action: { label: t("Kredi Yükle"), onClick: () => navigate("/market") },
            duration: 6000,
          });
        } else {
          toast.error(editTaskId ? t("Yardım çağrısı güncellenemedi.") : t("Yardım çağrısı oluşturulamadı."));
        }
        console.error(error);
        return;
      }

      // Yeni iş oluşturulduğunda yakındaki kullanıcılara push bildirimi gönder.
      // Bu isteğin başarısız olması ana akışı bozmasın diye sessizce yutuluyor.
      if (!editTaskId && newTaskId) {
        supabase.functions
          .invoke("notify-nearby-urgent-task", { body: { task_id: newTaskId } })
          .catch((err) => console.warn("Yakındakilere bildirim gönderilemedi:", err));
      }

      toast.success(editTaskId ? t("Yardım çağrısı güncellendi!") : t("Yardım çağrısı başarıyla oluşturuldu!"));
      navigate("/my-tasks");
    } catch (err) {
      setLoading(false);
      toast.error(t("Bir sorun oluştu."));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card"
        >
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">
          {editTaskId ? t("Yardım Çağrısını Düzenle") : t("Yardım Çağrısı Oluştur")}
        </h1>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-32">
        {/* Kategori Seçimi */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">
              {t("Kategori")} * {!isCustomCategory && <span className="text-xs text-muted-foreground"></span>}
            </label>
            <button
              type="button"
              onClick={() => {
                setIsCustomCategory(!isCustomCategory);
                setSelectedCategoryId(null);
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
            >
              {isCustomCategory ? (
                <>
                  <Grid size={14} /> {t("Listeden Seç")}
                </>
              ) : (
                <>
                  <Edit3 size={14} /> {t("Kategoriyi Elle Gir")}
                </>
              )}
            </button>
          </div>

          {isCustomCategory ? (
            <input
              type="text"
              value={customCategoryText}
              onChange={(e) => setCustomCategoryText(e.target.value)}
              placeholder={t("Örn: Akvaryum Temizliği, Avize Montajı...")}
              className="w-full rounded-xl border-2 border-primary bg-card px-4 py-3 text-sm text-foreground outline-none shadow-sm placeholder:text-muted-foreground/50"
              autoFocus
            />
          ) : (
            <>
              <div className="mb-2 flex items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-2.5 focus-within:border-primary">
                <SearchIcon size={16} className="text-muted-foreground" />
                <input
                  value={categoryQuery}
                  onChange={(e) => setCategoryQuery(e.target.value)}
                  placeholder={t("Kategori ara... (300+ seçenek)")}
                  className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {categories
                .filter((cat) => !categoryQuery || normalize(`${t(cat.label)} ${t(cat.label)}`).includes(normalize(categoryQuery)))
                .map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl p-2.5 text-center transition-all active:scale-95 ${
                    selectedCategoryId === cat.id
                      ? "gradient-warm text-primary-foreground shadow-soft"
                      : "border border-border bg-card text-foreground"
                  }`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-[11px] font-bold leading-tight whitespace-normal break-words text-center line-clamp-2">
                    {t(cat.label)}
                  </span>
                </button>
              ))}
              </div>
            </>
          )}
        </motion.div>

        {/* Açıklama */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-foreground">
            {t("Açıklama *")}
            <span className={`text-xs ${description.length < 20 ? "text-destructive" : "text-muted-foreground"}`}>
              {description.length}/500
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder={t("İşin detaylarını açıkla (min 20 karakter)...")}
            rows={3}
            className="w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
          />
        </motion.div>

        {/* Kişi Sayısı & Fiyat Alanı */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
              <Users size={18} className="text-primary" />
              {t("Kaç Kişi Lazım?")}
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PERSON_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setIsCustomPersonCount(false);
                    setPersonCount(opt.value);
                  }}
                  className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold transition-all ${
                    !isCustomPersonCount && personCount === opt.value
                      ? "bg-primary text-primary-foreground shadow-md scale-105"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span>{t(opt.label)}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIsCustomPersonCount(true)}
                className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold transition-all ${
                  isCustomPersonCount
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <span>{t("Diğer")}</span>
              </button>
            </div>

            {isCustomPersonCount && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={customPersonCountInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomPersonCountInput(value);
                    const count = parseInt(value, 10);
                    if (!isNaN(count) && count > 0) {
                      setPersonCount(count);
                    }
                  }}
                  placeholder={t("Örn: 6")}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
                />
                <span className="whitespace-nowrap text-sm font-bold text-muted-foreground">{t("kişi lazım")}</span>
              </div>
            )}
          </div>

          {personCount > 1 && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
                <Clock size={18} className="text-primary" />
                {t("El atanların gelmesini ne kadar süre beklemeyi düşünüyorsun?")}
              </label>
              <div className="flex flex-wrap gap-2">
                {WAIT_TIME_OPTIONS.map((opt) => (
                  <button
                    key={opt.minutes}
                    type="button"
                    onClick={() => setWaitMinutes(opt.minutes)}
                    className={`rounded-xl border-2 px-4 py-2 text-xs font-bold transition-colors ${
                      waitMinutes === opt.minutes
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    {t(opt.label)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {t("Kontenjan bu süre dolmadan tamamlanırsa iş otomatik başlar. Dolmazsa,\n                süre bitiminde çağrıyı sonlandırma veya mevcut kişilerle başlatma\n                seçeneği sana sunulur.")}
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-bold text-foreground">
              {t("Teklif Edilen Ücret (Kişi Başı) *")}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  inputMode="numeric"
                  value={basePriceInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
                    setBasePriceInput(digits);
                  }}
                  className="w-full rounded-xl border border-input bg-background p-3 pr-12 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="200"
                />
                <span className="absolute right-4 top-3.5 font-bold text-muted-foreground">{currencySymbol(currency)}</span>
              </div>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                aria-label={t("Para birimi")}
                className="w-[7.5rem] rounded-xl border border-input bg-background px-3 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-primary"
              >
                {CURRENCIES.map((code) => (
                  <option key={code} value={code}>{currencySymbol(code)} {t(CURRENCY_LABELS[code])}</option>
                ))}
              </select>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{t("Ödeme hangi para birimiyle yapılacak?")}</p>
          </div>

          {personCount > 1 && (
            <div className="flex justify-between items-center rounded-xl bg-primary/10 p-3 text-xs font-bold text-primary">
              <span>{t("{count} Kişi için Toplam Bütçe:", { count: personCount })}</span>
              <span className="text-base font-black">{formatPrice(totalPrice, currency)}</span>
            </div>
          )}
        </motion.div>

        {/* Fotoğraf */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">{t("Fotoğraf (opsiyonel)")}</label>
          <div className="flex gap-2">
            {photoPreviews.map((preview, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-border">
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            {photoPreviews.length < 2 && (
              <>
                <button
                  type="button"
                  onClick={() => addPhoto("camera")}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 transition-colors active:bg-primary/10"
                >
                  <Camera size={20} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary">{t("Çek")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => addPhoto("gallery")}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-0.5 rounded-xl border-2 border-dashed border-border bg-muted/50 transition-colors active:bg-muted"
                >
                  <ImageIcon size={20} className="text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{t("Galeri")}</span>
                </button>
              </>
            )}

          </div>
        </motion.div>

        {/* Süre */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">{t("İşin Tahmini Bitiş Süresi")}</label>
          <div className="flex flex-wrap gap-2">
            {durationPresets.map((d) => (
              <button
                key={d.minutes}
                type="button"
                onClick={() => {
                  setIsCustomDuration(false);
                  setDuration(d.minutes);
                }}
                className={`flex flex-1 basis-[30%] items-center justify-center gap-1 rounded-xl px-3 py-3 text-sm font-bold transition-all active:scale-95 ${
                  !isCustomDuration && duration === d.minutes
                    ? "gradient-warm text-primary-foreground shadow-soft"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                <Clock size={14} />
                {t(d.label)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setIsCustomDuration(true)}
              className={`flex flex-1 basis-[30%] items-center justify-center gap-1 rounded-xl px-3 py-3 text-sm font-bold transition-all active:scale-95 ${
                isCustomDuration
                  ? "gradient-warm text-primary-foreground shadow-soft"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              <Edit3 size={14} />
              {t("Diğer")}
            </button>
          </div>

          {isCustomDuration && (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={customDurationHours}
                onChange={(e) => {
                  const value = e.target.value;
                  setCustomDurationHours(value);
                  const hours = parseFloat(value);
                  if (!isNaN(hours) && hours > 0) {
                    setDuration(Math.round(hours * 60));
                  }
                }}
                placeholder={t("Örn: 10")}
                className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
              />
              <span className="whitespace-nowrap text-sm font-bold text-muted-foreground">{t("saat sürer")}</span>
            </div>
          )}
        </motion.div>

        {/* Alet-Edevat */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.22 }} className="rounded-2xl border border-border bg-card p-4">
          <button
            type="button"
            onClick={() => setNeedsTools((prev) => !prev)}
            className="flex w-full items-center justify-between"
          >
            <span className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Wrench size={18} className="text-primary" />
              {t("İş İçin Alet/Edevat Gerekiyor mu?")}
            </span>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all ${
                needsTools ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"
              }`}
            >
              {needsTools && <Check size={14} strokeWidth={3} />}
            </span>
          </button>

          {needsTools && (
            <div className="mt-4 space-y-4">
              {/* Aletleri kim getirecek */}
              <div>
                <label className="mb-2 block text-xs font-bold text-muted-foreground">
                  {t("Alet/Edevatı Kim Getirecek?")}
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setToolProvider("helper")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                      toolProvider === "helper"
                        ? "gradient-warm text-primary-foreground shadow-soft"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    <UserCheck size={14} />
                    {t("El Atan Getirsin")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setToolProvider("owner")}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                      toolProvider === "owner"
                        ? "gradient-warm text-primary-foreground shadow-soft"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    <Home size={14} />
                    {t("Ben Sağlayacağım")}
                  </button>
                </div>
              </div>

              {/* Alet arama ve seçim */}
              <div>
                <label className="mb-2 block text-xs font-bold text-muted-foreground">
                  {t("Gereken Alet/Malzemeleri Seç")} {selectedTools.length > 0 && `(${selectedTools.length} ${t("seçili")})`}
                </label>
                <div className="mb-2 flex items-center gap-2 rounded-xl border-2 border-border bg-background px-3 py-2.5 focus-within:border-primary">
                  <SearchIcon size={16} className="text-muted-foreground" />
                  <input
                    value={toolQuery}
                    onChange={(e) => setToolQuery(e.target.value)}
                    placeholder={t("Alet ara... (100+ seçenek)")}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                  />
                </div>
                <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
                  {TOOL_GROUPS.map((group) => {
                    const groupTools = ALL_TOOLS.filter(
                      (tool) =>
                        tool.group === group &&
                        (!toolQuery || normalize(tool.label).includes(normalize(toolQuery)))
                    );
                    if (groupTools.length === 0) return null;
                    return (
                      <div key={group}>
                        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
                          {t(group)}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {groupTools.map((tool) => (
                            <button
                              key={tool.id}
                              type="button"
                              onClick={() => toggleTool(tool.id)}
                              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                                selectedTools.includes(tool.id)
                                  ? "bg-primary text-primary-foreground"
                                  : "border border-border bg-background text-foreground"
                              }`}
                            >
                              {t(tool.label)}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manuel alet ekleme */}
              <div>
                <label className="mb-2 block text-xs font-bold text-muted-foreground">
                  {t("Liste­de Yoksa Elle Ekle")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customToolInput}
                    onChange={(e) => setCustomToolInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTool();
                      }
                    }}
                    placeholder={t("Örn: Akvaryum pompası...")}
                    className="flex-1 rounded-xl border-2 border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                  />
                  <button
                    type="button"
                    onClick={addCustomTool}
                    className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground active:scale-95"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {customTools.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {customTools.map((tool, i) => (
                      <span
                        key={`${tool}-${i}`}
                        className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary"
                      >
                        {tool}
                        <button type="button" onClick={() => removeCustomTool(i)}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {selectedTools.length + customTools.length === 0 && (
                <p className="text-[11px] font-semibold text-destructive">
                  ⚠️ {t("En az bir alet/malzeme seçmelisin ya da elle eklemelisin.")}
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Acillik */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">{t("Acillik")}</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setUrgency("urgent")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all active:scale-95 ${
                urgency === "urgent"
                  ? "bg-destructive text-destructive-foreground shadow-soft"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              <Flame size={16} />
              {t("Acil")}
            </button>
            <button
              type="button"
              onClick={() => setUrgency("can_wait")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all active:scale-95 ${
                urgency === "can_wait"
                  ? "gradient-warm text-primary-foreground shadow-soft"
                  : "border border-border bg-card text-foreground"
              }`}
            >
              <Clock size={16} />
              {t("Bekleyebilirim")}
            </button>
          </div>
        </motion.div>

        {/* Adres Notu */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            <MapPin size={14} className="mb-0.5 mr-1 inline text-primary" />
            {t("Adres Notu (opsiyonel)")}
          </label>
          <input
            type="text"
            value={addressNote}
            onChange={(e) => setAddressNote(e.target.value)}
            placeholder={t("Kapı zilini çalma, mesaj at...")}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
          />
        </motion.div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background px-5 pb-4 pt-2 safe-bottom">
        {!isValid && (
          <p className="mb-2 text-center text-xs text-muted-foreground">
            {!isValidCategory
              ? `⬆️ ${t("Bir kategori seçin veya kategori adını girin")}`
              : description.length < 20
                ? `⬆️ ${t("Açıklama en az 20 karakter olmalı. ({count}/20)", { count: description.length })}`
                : !isValidDuration
                  ? `⬆️ ${t("Süreyi saat cinsinden girin")}`
                  : !isValidPersonCount
                    ? `⬆️ ${t("Kişi sayısını girin")}`
                    : !isValidTools
                      ? `⬆️ ${t("En az bir alet/malzeme seç ya da elle ekle")}`
                      : ""}
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-all active:scale-[0.98] disabled:opacity-40"
        >
          {loading
            ? editTaskId
              ? t("Güncelleniyor...")
              : t("Oluşturuluyor...")
            : editTaskId
              ? t("Yardım Çağrısını Güncelle")
              : t("Yardım Çağrısı Oluştur!")}
        </button>
      </div>
    </div>
  );
};

export default CreateTask;
