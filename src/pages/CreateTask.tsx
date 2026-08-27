import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, Flame, Clock, X, Edit3, Grid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Supabase ENUM Tipleri: "ampul_takma" | "perde_asma" | "mobilya_monte" | "duvar_tamir" | "kucuk_tamir" | "tasima_yardimi"
type BaseEnum = "ampul_takma" | "perde_asma" | "mobilya_monte" | "duvar_tamir" | "kucuk_tamir" | "tasima_yardimi";

// 50 Adet Zengin Kategori Listesi
const categories: { id: string; emoji: string; label: string; baseEnum: BaseEnum }[] = [
  // Ev & Tamirat
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

  // Taşıma & Nakliye
  { id: "tasima_yardimi", emoji: "📦", label: "Taşıma Yardımı", baseEnum: "tasima_yardimi" },
  { id: "esya_tasima", emoji: "🚚", label: "Ağır Eşya Taşıma", baseEnum: "tasima_yardimi" },
  { id: "kurye_paket", emoji: "✉️", label: "Paket / Evrak Getirme", baseEnum: "tasima_yardimi" },
  { id: "alisveris_teslimat", emoji: "🛒", label: "Market Alışverişi", baseEnum: "tasima_yardimi" },
  { id: "arac_yukleme", emoji: "📦", label: "Araç Yükleme/Boşaltma", baseEnum: "tasima_yardimi" },

  // Temizlik & Düzen
  { id: "ev_temizligi", emoji: "🧹", label: "Ev Temizliği", baseEnum: "kucuk_tamir" },
  { id: "cam_silme", emoji: "🧼", label: "Cam Silme", baseEnum: "kucuk_tamir" },
  { id: "balkon_temizligi", emoji: "🪴", label: "Balkon Temizliği", baseEnum: "kucuk_tamir" },
  { id: "utu_yapma", emoji: "👔", label: "Ütü Yapma", baseEnum: "kucuk_tamir" },
  { id: "dolap_duzenleme", emoji: "👗", label: "Dolap Düzenleme", baseEnum: "kucuk_tamir" },
  { id: "hali_yikama", emoji: "🧽", label: "Halı / Koltuk Temizleme", baseEnum: "kucuk_tamir" },

  // Teknoloji & Kurulum
  { id: "tv_kurulum", emoji: "📺", label: "TV / Askı Aparatı", baseEnum: "duvar_tamir" },
  { id: "wifi_internet", emoji: "📡", label: "Wi-Fi / Modem Kurulumu", baseEnum: "kucuk_tamir" },
  { id: "bilgisayar_format", emoji: "💻", label: "PC / Format / Yazılım", baseEnum: "kucuk_tamir" },
  { id: "telefon_kurulum", emoji: "📱", label: "Akıllı Cihaz Kurulumu", baseEnum: "kucuk_tamir" },
  { id: "kablo_duzenleme", emoji: "🔌", label: "Kablo Gizleme/Düzen", baseEnum: "kucuk_tamir" },

  // Evcil Hayvan
  { id: "kopek_gezdirme", emoji: "🐕", label: "Köpek Gezdirme", baseEnum: "tasima_yardimi" },
  { id: "kedi_bakimi", emoji: "🐈", label: "Kedi Besleme / Bakım", baseEnum: "tasima_yardimi" },
  { id: "vet_goturme", emoji: "🏥", label: "Evcil Hayvan Taşıma", baseEnum: "tasima_yardimi" },

  // Bahçe & Dış Mekan
  { id: "bahce_sulama", emoji: "🌱", label: "Çiçek / Bahçe Sulama", baseEnum: "kucuk_tamir" },
  { id: "cim_bicme", emoji: "✂️", label: "Çim Biçme / Budama", baseEnum: "kucuk_tamir" },
  { id: "oto_yikama", emoji: "🚗", label: "Araba Yıkama / Temizlik", baseEnum: "kucuk_tamir" },
  { id: "aku_takviye", emoji: "🔋", label: "Akü Takviye / Oto", baseEnum: "kucuk_tamir" },

  // Kişisel & Yardım
  { id: "yasli_yardim", emoji: "👵", label: "Yaşlı / Hasta Yardımı", baseEnum: "tasima_yardimi" },
  { id: "refakat", emoji: "🤝", label: "Kısa Süreli Refakat", baseEnum: "tasima_yardimi" },
  { id: "cocuk_oyun", emoji: "🧸", label: "Çocuk Bakımı / Oyun", baseEnum: "tasima_yardimi" },

  // Özel Ders & Beceri
  { id: "ozel_ders", emoji: "📚", label: "Özel Ders / Ödev", baseEnum: "kucuk_tamir" },
  { id: "dil_pratik", emoji: "🗣️", label: "Yabancı Dil Pratiği", baseEnum: "kucuk_tamir" },
  { id: "muzik_dersi", emoji: "🎸", label: "Enstrüman Eğitimi", baseEnum: "kucuk_tamir" },
  { id: "fotograf_cekimi", emoji: "📸", label: "Fotoğraf Çekimi", baseEnum: "kucuk_tamir" },

  // Etkinlik & Diğer
  { id: "parti_hazirlik", emoji: "🎈", label: "Organizasyon / Parti", baseEnum: "tasima_yardimi" },
  { id: "yemek_hazirlik", emoji: "🍲", label: "Yemek / İkram Hazırlığı", baseEnum: "kucuk_tamir" },
  { id: "sira_bekleme", emoji: "⏳", label: "Sıra Bekleme Yardımı", baseEnum: "tasima_yardimi" },

  // Ekstra Teknik & Ağır İşler
  { id: "boya_badana", emoji: "🎨", label: "Rötuş / Boya İşi", baseEnum: "duvar_tamir" },
  { id: "beyaz_esya_baglanti", emoji: "🧺", label: "Çamaşır/Bulaşık Mak.", baseEnum: "kucuk_tamir" },
  { id: "avize_montaj", emoji: "💡", label: "Avize Montajı", baseEnum: "ampul_takma" },
  { id: "sineklik_montaj", emoji: "🦟", label: "Sineklik Takma", baseEnum: "perde_asma" },
  { id: "bisiklet_tamir", emoji: "🚲", label: "Bisiklet Bakım/Tamir", baseEnum: "kucuk_tamir" },
  { id: "klima_filitre", emoji: "❄️", label: "Klima Filtre Temizlik", baseEnum: "kucuk_tamir" },
  { id: "cesitli_isler", emoji: "✨", label: "Çeşitli Genel İşler", baseEnum: "kucuk_tamir" },
];

const durations = [15, 30, 45, 60];

const CreateTask = () => {
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
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const addPhoto = () => {
    if (photos.length >= 2) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setPhotos([...photos, file]);
        setPhotoPreviews([...photoPreviews, URL.createObjectURL(file)]);
      }
    };
    input.click();
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const isValidCategory = isCustomCategory
    ? customCategoryText.trim().length >= 3
    : Boolean(selectedCategoryId);

  const isValid = isValidCategory && description.length >= 20 && price >= 50;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setLoading(true);

    let lat = 40.9903,
      lng = 29.0297;
    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}
    }

    const photoUrls: string[] = [];
    for (const photo of photos) {
      const ext = photo.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("task-photos").upload(path, photo);
      if (!error) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("task-photos").getPublicUrl(path);
        photoUrls.push(publicUrl);
      }
    }

    // Seçilen kategori nesnesini bul
    const selectedCatObj = categories.find((c) => c.id === selectedCategoryId);

    // Başlık belirleme: Elle girildiyse girilen metin, değilse kategorinin etiket adı
    const taskTitle = isCustomCategory
      ? customCategoryText.trim()
      : selectedCatObj?.label || "Yardım Çağrısı";

    // Supabase ENUM Çökmesini Engelleme:
    // Elle girildiyse varsayılan 'kucuk_tamir' enum'ını kullan; listeden seçildiyse eşleşen baseEnum değerini al.
    const enumCategory: BaseEnum = isCustomCategory
      ? "kucuk_tamir"
      : selectedCatObj?.baseEnum || "kucuk_tamir";

const safePrice = Math.max(50, price);
const safeMinPrice = urgency === "can_wait" ? Math.max(50, Math.round(safePrice * 0.65)) : safePrice;

const { error } = await supabase.from("tasks").insert({
  owner_id: user.id,
  title: taskTitle,
  description,
  category: enumCategory as any,
  urgency,
  price: safePrice,
  current_price: safePrice, // null kalmaması için eklendi
  min_price: safeMinPrice,   // null kalmaması için eklendi
  estimated_minutes: duration,
  latitude: lat,
  longitude: lng,
  address_note: addressNote || null,
  photo_urls: photoUrls,
  price_drop_started_at: urgency === "can_wait" ? new Date().toISOString() : null,
});

    setLoading(false);

    if (error) {
      toast.error("Yardım çağrısı oluşturulamadı.");
      console.error(error);
      return;
    }

    toast.success("Yardım çağrısı başarıyla oluşturuldu!");
    navigate("/home");
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
        <h1 className="text-xl font-black text-foreground">Yardım Çağrısı Oluştur</h1>
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
            className="w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary text-foreground"
          />
        </motion.div>

        {/* Fotoğraf */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">Fotoğraf (opsiyonel)</label>
          <div className="flex gap-2">
            {photoPreviews.map((preview, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl">
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive"
                >
                  <X size={12} className="text-destructive-foreground" />
                </button>
              </div>
            ))}
            {photos.length < 2 && (
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

        {/* Fiyat (Slider + Elle Girme Kutusu) */}
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
          {urgency === "can_wait" && (
            <p className="mt-2 rounded-lg bg-accent/20 px-3 py-2 text-xs text-muted-foreground">
              💡 Fiyat zamanla düşecek. Minimum:{" "}
              <span className="font-bold text-foreground">{Math.round(price * 0.65)} ₺</span>
            </p>
          )}
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
          {loading ? "Oluşturuluyor..." : "Yardım Çağrısı Oluştur!"}
        </button>
      </div>
    </div>
  );
};

export default CreateTask;
