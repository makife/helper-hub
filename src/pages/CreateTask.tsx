import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, Flame, Clock, X, Edit3, Grid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type BaseEnum = "ampul_takma" | "perde_asma" | "mobilya_monte" | "duvar_tamir" | "kucuk_tamir" | "tasima_yardimi";

const categories: { id: string; emoji: string; label: string; baseEnum: BaseEnum }[] = [
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

const durations = [15, 30, 45, 60];

// Kişi Sayısı Seçenekleri
const PERSON_OPTIONS = [
  { value: 1, label: "1 Kişi", multiplier: 1 },
  { value: 2, label: "2 Kişi", multiplier: 2 },
  { value: 3, label: "3 Kişi", multiplier: 3 },
  { value: 4, label: "4+ Kişi", multiplier: 4 },
];

export const PersonAndPriceSection = () => {
  const [personCount, setPersonCount] = useState<number>(1);
  const [basePrice, setBasePrice] = useState<number>(200); // Kişi başı veya taban teklif

  // Toplam Fiyat Hesaplama
  const totalPrice = basePrice * personCount;

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      {/* Kişi Sayısı Seçimi */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-bold text-foreground">
          <Users size={18} className="text-primary" />
          Kaç Kişi Lazım?
        </label>
        <div className="grid grid-cols-4 gap-2">
          {PERSON_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPersonCount(opt.value)}
              className={`flex flex-col items-center justify-center rounded-xl p-2.5 text-xs font-bold transition-all ${
                personCount === opt.value
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Fiyat Girdisi */}
      <div>
        <label className="mb-1 block text-sm font-bold text-foreground">
          Teklif Edilen Ücret (Kişi Başı)
        </label>
        <div className="relative">
          <input
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            className="w-full rounded-xl border border-input bg-background p-3 text-base font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="200"
          />
          <span className="absolute right-4 top-3.5 font-bold text-muted-foreground">₺</span>
        </div>
      </div>

      {/* Özet ve Toplam Tutar */}
      {personCount > 1 && (
        <div className="flex justify-between items-center rounded-xl bg-primary/10 p-3 text-xs font-bold text-primary">
          <span>{personCount} Kişi için Toplam Bütçe:</span>
          <span className="text-base font-black">{totalPrice} ₺</span>
        </div>
      )}
    </div>
  );
};

const CreateTask = () => {
  const [searchParams] = useSearchParams();
  const editTaskId = searchParams.get("edit");

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState("");

  const [description, setDescription] = useState("");
  const [price, setPrice] = useState(200);
  const [duration, setDuration] = useState(30);
  const [urgency, setUrgency] = useState<"urgent" | "can_wait">("can_wait");
  const [addressNote, setAddressNote] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // DÜZENLEME MODU: Mevcut İlan Bilgilerini Form Alanlarına Yükle
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
        setPrice(data.price || 200);
        setDuration(data.estimated_minutes || 30);
        setUrgency((data.urgency as "urgent" | "can_wait") || "can_wait");
        setAddressNote(data.address_note || "");
        setExistingPhotoUrls(data.photo_urls || []);
        setPhotoPreviews(data.photo_urls || []);

        // Kategori Eşleme
        const matchedCat = categories.find((c) => c.label === data.title);
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

  const addPhoto = () => {
    if (photoPreviews.length >= 2) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
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

  const isValidCategory = isCustomCategory
    ? customCategoryText.trim().length >= 3
    : Boolean(selectedCategoryId);

  const isValid = isValidCategory && description.length >= 20 && price >= 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isValid) return;

    setLoading(true);

    try {
      // 1. Yeni Yüklenen Fotoğrafları Storage'a Yükle
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

      const enumCategory: BaseEnum = isCustomCategory
        ? "kucuk_tamir"
        : selectedCatObj?.baseEnum || "kucuk_tamir";

      const safePrice = Math.max(50, price);
      const safeMinPrice = urgency === "can_wait" ? Math.max(50, Math.round(safePrice * 0.65)) : safePrice;

      const taskPayload = {
        owner_id: user.id,
        title: taskTitle,
        description,
        category: enumCategory as any,
        urgency,
        price: safePrice,
        current_price: safePrice,
        min_price: safeMinPrice,
        estimated_minutes: duration,
        address_note: addressNote || null,
        photo_urls: finalPhotoUrls,
        price_drop_started_at: urgency === "can_wait" ? new Date().toISOString() : null,
      };

      let error;

      if (editTaskId) {
        // DÜZENLEME MODU (UPDATE)
        const res = await supabase
          .from("tasks")
          .update(taskPayload)
          .eq("id", editTaskId);
        error = res.error;
      } else {
        // YENİ KAYIT MODU (INSERT)
        const res = await supabase
          .from("tasks")
          .insert(taskPayload);
        error = res.error;
      }

      setLoading(false);

      if (error) {
        toast.error(editTaskId ? "Yardım çağrısı güncellenemedi." : "Yardım çağrısı oluşturulamadı.");
        console.error(error);
        return;
      }

      toast.success(editTaskId ? "Yardım çağrısı güncellendi!" : "Yardım çağrısı başarıyla oluşturuldu!");
      navigate("/my-tasks");
    } catch (err) {
      setLoading(false);
      toast.error("Bir sorun oluştu.");
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
          {editTaskId ? "Yardım Çağrısını Düzenle" : "Yardım Çağrısı Oluştur"}
        </h1>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 pb-32">
        {/* Kategori Seçimi */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">
              Kategori * {!isCustomCategory && <span className="text-xs text-muted-foreground">({categories.length} Seçenek)</span>}
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
                  <Grid size={14} /> Listeden Seç
                </>
              ) : (
                <>
                  <Edit3 size={14} /> Kategoriyi Elle Gir
                </>
              )}
            </button>
          </div>

          {isCustomCategory ? (
            <input
              type="text"
              value={customCategoryText}
              onChange={(e) => setCustomCategoryText(e.target.value)}
              placeholder="Örn: Akvaryum Temizliği, Avize Montajı..."
              className="w-full rounded-xl border-2 border-primary bg-card px-4 py-3 text-sm text-foreground outline-none shadow-sm placeholder:text-muted-foreground/50"
              autoFocus
            />
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-xl p-3 text-center transition-all active:scale-95 ${
                    selectedCategoryId === cat.id
                      ? "gradient-warm text-primary-foreground shadow-soft"
                      : "border border-border bg-card text-foreground"
                  }`}
                >
                  <span className="text-2xl">{cat.emoji}</span>
                  <span className="text-xs font-bold line-clamp-1">{cat.label}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Açıklama */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.05 }}>
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-foreground">
            Açıklama *
            <span className={`text-xs ${description.length < 20 ? "text-destructive" : "text-muted-foreground"}`}>
              {description.length}/500
            </span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 500))}
            placeholder="İşin detaylarını açıkla (min 20 karakter)..."
            rows={3}
            className="w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
          />
        </motion.div>

        {/* Fotoğraf */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">Fotoğraf (opsiyonel)</label>
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
              <button
                type="button"
                onClick={addPhoto}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 transition-colors active:bg-muted"
              >
                <Camera size={20} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Ekle</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Fiyat */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground">Fiyat (₺) *</label>
            <div className="flex items-center gap-1 rounded-xl border-2 border-primary bg-card px-3 py-1">
              <input
                type="number"
                min={50}
                max={5000}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="w-20 text-right text-lg font-black text-primary outline-none bg-transparent"
              />
              <span className="font-bold text-primary">₺</span>
            </div>
          </div>
          <input
            type="range"
            min={100}
            max={1000}
            step={10}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100 ₺</span>
            <span>1000 ₺</span>
          </div>
        </motion.div>

        {/* Süre */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">Tahmini Süre</label>
          <div className="flex gap-2">
            {durations.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDuration(d)}
                className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-3 py-3 text-sm font-bold transition-all active:scale-95 ${
                  duration === d
                    ? "gradient-warm text-primary-foreground shadow-soft"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                <Clock size={14} />
                {d} dk
              </button>
            ))}
          </div>
        </motion.div>

        {/* Acillik */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">Acillik</label>
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
              Acil
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
              Bekleyebilirim
            </button>
          </div>
        </motion.div>

        {/* Adres Notu */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">
            <MapPin size={14} className="mb-0.5 mr-1 inline text-primary" />
            Adres Notu (opsiyonel)
          </label>
          <input
            type="text"
            value={addressNote}
            onChange={(e) => setAddressNote(e.target.value)}
            placeholder="Kapı zilini çalma, mesaj at..."
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
          />
        </motion.div>
      </div>

      {/* Submit Button */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background px-5 pb-4 pt-2 safe-bottom">
        {!isValid && (
          <p className="mb-2 text-center text-xs text-muted-foreground">
            {!isValidCategory
              ? "⬆️ Bir kategori seçin veya kategori adını girin"
              : description.length < 20
                ? `⬆️ Açıklama en az 20 karakter olmalı. (${description.length}/20)`
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
              ? "Güncelleniyor..."
              : "Oluşturuluyor..."
            : editTaskId
              ? "Yardım Çağrısını Güncelle"
              : "Yardım Çağrısı Oluştur!"}
        </button>
      </div>
    </div>
  );
};

export default CreateTask;
