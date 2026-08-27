import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, MapPin, Flame, Clock, X, Edit3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// 50+ Detaylı Kategori Listesi
const categories = [
  // Ev & Tamirat
  { id: "ampul_takma", emoji: "💡", label: "Ampul Takma" },
  { id: "perde_asma", emoji: "🪟", label: "Perde Asma" },
  { id: "mobilya_monte", emoji: "🪑", label: "Mobilya Montajı" },
  { id: "duvar_tamir", emoji: "🔨", label: "Duvar Tamiri" },
  { id: "kucuk_tamir", emoji: "🔧", label: "Küçük Tamirat" },
  { id: "musluk_tamir", emoji: "🚰", label: "Musluk / Batarya" },
  { id: "kapı_kilit", emoji: "🔑", label: "Kilit / Kol Değişimi" },
  { id: "raf_montaj", emoji: "📐", label: "Tablo / Raf Asma" },
  { id: "silikon_cekme", emoji: "🧪", label: "Silikon Çekme" },
  { id: "tikaniklik_acma", emoji: "🪠", label: "Gider Açma" },

  // Taşıma & Nakliye
  { id: "tasima_yardimi", emoji: "📦", label: "Taşıma Yardımı" },
  { id: "esya_tasima", emoji: "🚚", label: "Ağır Eşya Taşıma" },
  { id: "kurye_paket", emoji: "✉️", label: "Paket / Evrak Getirme" },
  { id: "alisveris_teslimat", emoji: "🛒", label: "Market Alışverişi" },
  { id: "arac_yukleme", emoji: "📦", label: "Araç Yükleme/Boşaltma" },

  // Temizlik & Düzen
  { id: "ev_temizligi", emoji: "🧹", label: "Ev Temizliği" },
  { id: "cam_silme", emoji: "🧼", label: "Cam Silme" },
  { id: "balkon_temizligi", emoji: "🪴", label: "Balkon Temizliği" },
  { id: "utulu_kıyafet", emoji: "👔", label: "Ütü Yapma" },
  { id: "dolap_duzenleme", emoji: "👗", label: "Dolap Düzenleme" },
  { id: "hali_yikama_yardim", emoji: "🧽", label: "Halı / Koltuk Temizliği" },

  // Teknoloji & Kurulum
  { id: "tv_kurulum", emoji: "📺", label: "TV / Askı Aparatı" },
  { id: "wifi_internet", emoji: "📡", label: "Wi-Fi / Modem Kurulumu" },
  { id: "bilgisayar_format", emoji: "💻", label: "PC / Format / Yazılım" },
  { id: "telefon_kurulum", emoji: "📱", label: "Telefon Akıllı Cihaz" },
  { id: "kablo_duzenleme", emoji: "🔌", label: "Kablo Gizleme/Düzen" },

  // Evcil Hayvan
  { id: "kopek_gezdirme", emoji: "🐕", label: "Köpek Gezdirme" },
  { id: "kedi_bakimi", emoji: "🐈", label: "Kedi Besleme / Bakım" },
  { id: "vet_götürme", emoji: "🏥", label: "Evcil Hayvan Taşıma" },

  // Bahçe & Dış Mekan
  { id: "bahce_sulama", emoji: "🌱", label: "Çiçek / Bahçe Sulama" },
  { id: "ot_biciim", emoji: "✂️", label: "Çim Biçme / Budama" },
  { id: "oto_yikama", emoji: "🚗", label: "Araba Yıkama / Temizlik" },
  { id: "akü_takviye", emoji: "🔋", label: "Akü Takviye / Oto" },

  // Kişisel & Yardım
  { id: "yasli_yardim", emoji: "👵", label: "Yaşlı / Hasta Yardımı" },
  { id: "refakat", emoji: "🤝", label: "Kısa Süreli Refakat" },
  { id: "cocuk_oyun", emoji: "🧸", label: "Çocuk Bakımı / Oyun" },

  // Özel Yetenek & Ders
  { id: "ozel_ders", emoji: "📚", label: "Özel Ders / Ödev" },
  { id: "dil_pratik", emoji: "🗣️", label: "Yabancı Dil Pratiği" },
  { id: "muzik_dersi", emoji: "🎸", label: "Enstrüman Eğitimi" },
  { id: "fotograf_cekimi", emoji: "📸", label: "Fotoğraf Çekimi" },

  // Etkinlik & Diğer
  { id: "parti_hazirlik", emoji: "🎈", label: "Organizasyon / Parti" },
  { id: "yemek_hazirlik", emoji: "🍲", label: "Yemek / İkram Hazırlığı" },
  { id: "sira_bekleme", emoji: "⏳", label: "Sıra Bekleme Yardımı" },
  { id: "diger_yardim", emoji: "✨", label: "Çeşitli İşler" },
  
  // Ekstra Teknik & Ağır İşler
  { id: "boya_badana", emoji: "🎨", label: "Rötuş / Boya İşi" },
  { id: "beyaz_esya_baglanti", emoji: "🧺", label: "Çamaşır/Bulaşık Mak." },
  { id: "avize_montaj", emoji: "💡", label: "Avize / Armatür Montajı" },
  { id: "sineklik_montaj", emoji: "🦟", label: "Sineklik Takma" },
  { id: "bisiklet_tamir", emoji: "🚲", label: "Bisiklet Bakım/Tamir" },

  // Özel Kategori Seçeneği
  { id: "custom", emoji: "✏️", label: "Kategoriyi Elle Gir" },
];

const durations = [15, 30, 45, 60];

const CreateTask = () => {
  const [category, setCategory] = useState<string | null>(null);
  const [customCategory, setCustomCategory] = useState("");
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

  const isValidCategory = category === "custom" ? customCategory.trim().length > 2 : Boolean(category);
  const isValid = isValidCategory && description.length >= 20;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setLoading(true);

    let lat = 40.9903,
      lng = 29.0297;
    if ("geolocation" in navigator) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 }),
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

    const selectedCat = categories.find((c) => c.id === category);
    const categoryTitle = category === "custom" ? customCategory.trim() : selectedCat?.label || "";

    const minPrice = urgency === "can_wait" ? Math.round(price * 0.65) : price;

    const { error } = await supabase.from("tasks").insert({
      owner_id: user.id,
      title: categoryTitle,
      description,
      category: (category === "custom" ? "diger_yardim" : category) as any,
      urgency,
      price,
      current_price: price,
      min_price: minPrice,
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
        {/* Category Selection */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">
            Kategori * <span className="text-xs font-normal text-muted-foreground">({categories.length} Seçenek)</span>
          </label>
          
          <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl p-3 text-center transition-all active:scale-95 ${
                  category === cat.id
                    ? "gradient-warm text-primary-foreground shadow-soft"
                    : "border border-border bg-card"
                }`}
              >
                <span className="text-2xl">{cat.emoji}</span>
                <span className="text-xs font-bold line-clamp-1">{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Custom Category Input */}
          {category === "custom" && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3">
              <div className="relative">
                <Edit3 className="absolute left-3.5 top-3.5 text-muted-foreground" size={16} />
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Kategorinizi özel olarak yazın (ör: Akvaryum Temizliği)..."
                  className="w-full rounded-xl border-2 border-primary bg-card pl-10 pr-4 py-2.5 text-sm text-foreground outline-none shadow-sm"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Description */}
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

        {/* Photos */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">Fotoğraf (opsiyonel)</label>
          <div className="flex gap-2">
            {photoPreviews.map((preview, i) => (
              <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl">
                <img src={preview} alt="" className="h-full w-full object-cover" />
                <button
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive"
                >
                  <X size={12} className="text-destructive-foreground" />
                </button>
              </div>
            ))}
            {photos.length < 2 && (
              <button
                onClick={addPhoto}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50 transition-colors active:bg-muted"
              >
                <Camera size={20} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Ekle</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Price Slider */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <label className="mb-2 flex items-center justify-between text-sm font-semibold text-foreground">
            Fiyat
            <span className="text-xl font-black text-primary">{price} ₺</span>
          </label>
          <input
            type="range"
            min={100}
            max={500}
            step={10}
            value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>100 ₺</span>
            <span>500 ₺</span>
          </div>
        </motion.div>

        {/* Duration */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">Tahmini Süre</label>
          <div className="flex gap-2">
            {durations.map((d) => (
              <button
                key={d}
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

        {/* Urgency */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">Acillik</label>
          <div className="flex gap-3">
            <button
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
              💡 Fiyat her 10 dakikada %8-10 düşecek. Minimum:{" "}
              <span className="font-bold text-foreground">{Math.round(price * 0.65)} ₺</span>
            </p>
          )}
        </motion.div>

        {/* Address Note */}
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
              ? "⬆️ Bir kategori seçin veya özel bir kategori adı yazın"
              : description.length < 20
                ? `⬆️ Açıklama en az 20 karakter olmalı. (${description.length}/20)`
                : ""}
          </p>
        )}
        <button
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
