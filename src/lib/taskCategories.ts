export type TaskBaseCategory =
  | "ampul_takma"
  | "perde_asma"
  | "mobilya_monte"
  | "duvar_tamir"
  | "kucuk_tamir"
  | "tasima_yardimi";

export type TaskCategoryDefinition = {
  id: string;
  emoji: string;
  label: string;
  baseEnum: TaskBaseCategory;
};

export const TASK_CATEGORIES: TaskCategoryDefinition[] = [
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

const categoryById = new Map(TASK_CATEGORIES.map((category) => [category.id, category]));

export function getTaskCategory(category: string, subcategory?: string | null, title?: string) {
  if (subcategory) {
    const exactSubcategory = categoryById.get(subcategory);
    if (exactSubcategory) return exactSubcategory;
  }

  const exactCategory = categoryById.get(category);
  if (exactCategory) return exactCategory;

  const normalizedTitle = title?.trim().toLocaleLowerCase("tr-TR");
  return TASK_CATEGORIES.find(
    (item) => item.label.toLocaleLowerCase("tr-TR") === normalizedTitle,
  );
}

export function getTaskEmoji(category: string, subcategory?: string | null, title?: string) {
  return getTaskCategory(category, subcategory, title)?.emoji ?? "✨";
}