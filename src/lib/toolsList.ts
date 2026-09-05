export interface ToolItem {
  id: string;
  label: string;
  group: string;
}

// 100+ alet/malzeme türü, gruplara ayrılmış
export const ALL_TOOLS: ToolItem[] = [
  // El Aletleri
  { id: "cekic", label: "Çekiç", group: "El Aletleri" },
  { id: "tornavida_seti", label: "Tornavida Seti", group: "El Aletleri" },
  { id: "duz_tornavida", label: "Düz Tornavida", group: "El Aletleri" },
  { id: "yildiz_tornavida", label: "Yıldız Tornavida", group: "El Aletleri" },
  { id: "pense", label: "Pense", group: "El Aletleri" },
  { id: "kerpeten", label: "Kerpeten", group: "El Aletleri" },
  { id: "kargaburun", label: "Kargaburun", group: "El Aletleri" },
  { id: "ingiliz_anahtari", label: "İngiliz Anahtarı", group: "El Aletleri" },
  { id: "alyan_seti", label: "Alyan Anahtar Seti", group: "El Aletleri" },
  { id: "lokma_takimi", label: "Lokma Takımı", group: "El Aletleri" },
  { id: "cirdcir_anahtar", label: "Cırcır Anahtar", group: "El Aletleri" },
  { id: "serit_metre", label: "Şerit Metre", group: "El Aletleri" },
  { id: "su_terazisi", label: "Su Terazisi", group: "El Aletleri" },
  { id: "maket_bicagi", label: "Maket Bıçağı", group: "El Aletleri" },
  { id: "makas", label: "Makas", group: "El Aletleri" },
  { id: "el_testeresi", label: "El Testeresi", group: "El Aletleri" },
  { id: "zimba_tabancasi", label: "Zımba Tabancası", group: "El Aletleri" },

  // Elektrikli Aletler
  { id: "matkap_vidalama", label: "Matkap / Vidalama", group: "Elektrikli Aletler" },
  { id: "darbeli_matkap", label: "Darbeli Matkap", group: "Elektrikli Aletler" },
  { id: "avuc_taslama", label: "Avuç Taşlama", group: "Elektrikli Aletler" },
  { id: "dekupaj_testeresi", label: "Dekupaj Testeresi", group: "Elektrikli Aletler" },
  { id: "daire_testere", label: "Daire Testere", group: "Elektrikli Aletler" },
  { id: "zimpara_makinesi", label: "Zımpara Makinesi", group: "Elektrikli Aletler" },
  { id: "spiral_ogutucu", label: "Spiral / Öğütücü", group: "Elektrikli Aletler" },
  { id: "cim_bicme_makinesi", label: "Çim Biçme Makinesi", group: "Elektrikli Aletler" },
  { id: "yaprak_ufleyici", label: "Yaprak Üfleyici", group: "Elektrikli Aletler" },
  { id: "hidrofor", label: "Basınçlı Yıkama Makinesi (Hidrofor)", group: "Elektrikli Aletler" },
  { id: "kaynak_makinesi", label: "Kaynak Makinesi", group: "Elektrikli Aletler" },
  { id: "sicak_hava_tabancasi", label: "Sıcak Hava Tabancası", group: "Elektrikli Aletler" },
  { id: "multimetre", label: "Multimetre", group: "Elektrikli Aletler" },
  { id: "kablo_dedektoru", label: "Kablo Dedektörü", group: "Elektrikli Aletler" },

  // Boya-Badana
  { id: "boya_fircasi", label: "Boya Fırçası", group: "Boya-Badana" },
  { id: "boya_rulosu", label: "Boya Rulosu", group: "Boya-Badana" },
  { id: "boya_tepsisi", label: "Boya Tepsisi", group: "Boya-Badana" },
  { id: "maskeleme_bandi", label: "Maskeleme Bandı", group: "Boya-Badana" },
  { id: "naylon_ortu", label: "Naylon Örtü", group: "Boya-Badana" },
  { id: "zimpara_kagidi", label: "Zımpara Kağıdı", group: "Boya-Badana" },
  { id: "alci_macunu", label: "Alçı Macunu", group: "Boya-Badana" },
  { id: "astar_boya", label: "Astar Boya", group: "Boya-Badana" },
  { id: "tiner", label: "Tiner", group: "Boya-Badana" },
  { id: "spatula", label: "Spatula", group: "Boya-Badana" },

  // Su Tesisatı
  { id: "boru_anahtari", label: "Boru Anahtarı", group: "Su Tesisatı" },
  { id: "su_pompa_tesi", label: "Su Pompa Tesi", group: "Su Tesisatı" },
  { id: "teflon_bant", label: "Teflon Bant", group: "Su Tesisatı" },
  { id: "silikon_tabancasi", label: "Silikon Tabancası", group: "Su Tesisatı" },
  { id: "conta_seti", label: "Conta Seti", group: "Su Tesisatı" },
  { id: "sifon_anahtari", label: "Sifon Anahtarı", group: "Su Tesisatı" },
  { id: "boru_kesici", label: "Boru Kesici", group: "Su Tesisatı" },
  { id: "havya", label: "Havya (Lehim)", group: "Su Tesisatı" },

  // Elektrik Malzemeleri
  { id: "kablo", label: "Kablo", group: "Elektrik Malzemeleri" },
  { id: "priz_anahtar", label: "Priz / Anahtar", group: "Elektrik Malzemeleri" },
  { id: "sigorta", label: "Sigorta", group: "Elektrik Malzemeleri" },
  { id: "izole_bant", label: "İzole Bant", group: "Elektrik Malzemeleri" },
  { id: "kablo_kanali", label: "Kablo Kanalı", group: "Elektrik Malzemeleri" },
  { id: "kablo_pense", label: "Kablo Sıyırma Pensesi", group: "Elektrik Malzemeleri" },
  { id: "voltaj_kalemi", label: "Voltaj Test Kalemi", group: "Elektrik Malzemeleri" },
  { id: "elektrikli_tornavida", label: "Elektrikli Tornavida", group: "Elektrik Malzemeleri" },

  // Yapı & Montaj
  { id: "civi", label: "Çivi", group: "Yapı & Montaj" },
  { id: "vida", label: "Vida", group: "Yapı & Montaj" },
  { id: "dubel", label: "Dübel", group: "Yapı & Montaj" },
  { id: "silikon", label: "Silikon", group: "Yapı & Montaj" },
  { id: "yapi_yapistiricisi", label: "Yapı Yapıştırıcısı", group: "Yapı & Montaj" },
  { id: "mala", label: "Mala", group: "Yapı & Montaj" },
  { id: "mastar", label: "Mastar", group: "Yapı & Montaj" },
  { id: "lazer_seviye_olcer", label: "Lazer Seviye Ölçer", group: "Yapı & Montaj" },
  { id: "merdiven", label: "Merdiven", group: "Yapı & Montaj" },
  { id: "calisma_tezgahi", label: "Çalışma Tezgahı (Sehpa)", group: "Yapı & Montaj" },
  { id: "panc", label: "Panç (Delik Açma)", group: "Yapı & Montaj" },
  { id: "dubel_cakma_tabancasi", label: "Dübel Çakma Tabancası", group: "Yapı & Montaj" },

  // Bahçe
  { id: "bel", label: "Bel (Bahçe)", group: "Bahçe" },
  { id: "capa", label: "Çapa", group: "Bahçe" },
  { id: "tirmik", label: "Tırmık", group: "Bahçe" },
  { id: "budama_makasi", label: "Budama Makası", group: "Bahçe" },
  { id: "bahce_el_arabasi", label: "Bahçe El Arabası", group: "Bahçe" },
  { id: "sulama_hortumu", label: "Sulama Hortumu", group: "Bahçe" },
  { id: "fiskiye", label: "Fıskiye", group: "Bahçe" },
  { id: "gubre", label: "Gübre", group: "Bahçe" },
  { id: "bahce_makasi", label: "Bahçe Makası", group: "Bahçe" },
  { id: "motorlu_testere", label: "Motorlu Testere", group: "Bahçe" },

  // Temizlik
  { id: "supurge", label: "Süpürge", group: "Temizlik" },
  { id: "paspas", label: "Paspas", group: "Temizlik" },
  { id: "elektrikli_supurge", label: "Elektrikli Süpürge", group: "Temizlik" },
  { id: "hali_yikama_makinesi", label: "Halı Yıkama Makinesi", group: "Temizlik" },
  { id: "cam_silecegi", label: "Cam Sileceği", group: "Temizlik" },
  { id: "temizlik_bezi", label: "Temizlik Bezi", group: "Temizlik" },
  { id: "deterjan", label: "Deterjan", group: "Temizlik" },
  { id: "cop_posedi", label: "Çöp Poşeti", group: "Temizlik" },
  { id: "temizlik_fircasi", label: "Temizlik Fırçası", group: "Temizlik" },
  { id: "kova", label: "Kova", group: "Temizlik" },

  // Taşıma & Nakliye
  { id: "koli_bandi", label: "Koli Bandı", group: "Taşıma & Nakliye" },
  { id: "karton_kutu", label: "Karton Kutu", group: "Taşıma & Nakliye" },
  { id: "baloncuk_naylon", label: "Balonlu Naylon", group: "Taşıma & Nakliye" },
  { id: "halat_ip", label: "Halat / İp", group: "Taşıma & Nakliye" },
  { id: "tasima_el_arabasi", label: "Taşıma El Arabası", group: "Taşıma & Nakliye" },
  { id: "kaldirma_kayisi", label: "Kaldırma Kayışı", group: "Taşıma & Nakliye" },
  { id: "tasima_battaniyesi", label: "Taşıma Battaniyesi", group: "Taşıma & Nakliye" },
  { id: "cember_germe_aleti", label: "Çember Germe Aleti", group: "Taşıma & Nakliye" },
  { id: "transpalet", label: "Transpalet / El Forkliftı", group: "Taşıma & Nakliye" },

  // Güvenlik & Koruyucu
  { id: "is_eldiveni", label: "İş Eldiveni", group: "Güvenlik & Koruyucu" },
  { id: "koruyucu_gozluk", label: "Koruyucu Gözlük", group: "Güvenlik & Koruyucu" },
  { id: "toz_maskesi", label: "Toz Maskesi", group: "Güvenlik & Koruyucu" },
  { id: "baret", label: "Baret", group: "Güvenlik & Koruyucu" },
  { id: "is_ayakkabisi", label: "İş Ayakkabısı", group: "Güvenlik & Koruyucu" },
  { id: "kulak_tikaci", label: "Kulak Tıkacı", group: "Güvenlik & Koruyucu" },
  { id: "yansitici_yelek", label: "Yansıtıcı Yelek", group: "Güvenlik & Koruyucu" },

  // Ev Aletleri
  { id: "utu", label: "Ütü", group: "Ev Aletleri" },
  { id: "utu_masasi", label: "Ütü Masası", group: "Ev Aletleri" },

  // Diğer
  { id: "uzatma_kablosu", label: "Uzatma Kablosu", group: "Diğer" },
  { id: "el_feneri", label: "El Feneri", group: "Diğer" },
  { id: "kafa_lambasi", label: "Kafa Lambası", group: "Diğer" },
  { id: "jenerator", label: "Jeneratör", group: "Diğer" },
  { id: "kompresor", label: "Kompresör", group: "Diğer" },
  { id: "seyyar_sehpa", label: "Seyyar Sehpa", group: "Diğer" },
  { id: "cirt_bant", label: "Cırt Bant", group: "Diğer" },
  { id: "tel", label: "Tel", group: "Diğer" },
];

export const TOOL_GROUPS = Array.from(new Set(ALL_TOOLS.map((t) => t.group)));
