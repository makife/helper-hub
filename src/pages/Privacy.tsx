import { useT } from "@/lib/i18n";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Lock, UserCircle, MapPin, MessageSquare, CreditCard, Eye, Trash2, Mail } from "lucide-react";

const sections = [
  {
    icon: Lock,
    title: "1. Veri Sorumlusu",
    content: [
      "Veri sorumlusu: Ergan Game&App (makifergan@gmail.com).",
      "Bu politika, Bi' El At uygulamasında işlenen kişisel verilerin hangi amaçla, ne şekilde ve ne kadar süreyle saklandığını açıklar.",
      "Uygulama, 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve ilgili düzenlemelere uygun olarak çalışır.",
    ],
  },
  {
    icon: UserCircle,
    title: "2. Toplanan Veriler",
    content: [
      "Kimlik bilgileri: ad, soyad, profil fotoğrafı, telefon numarası (giriş amaçlı).",
      "Konum verileri: cihaz GPS veya IP tabanlı yaklaşık konum, yakındaki çağrıları göstermek için kullanılır.",
      "Profil verileri: beceriler, meslek, biyografi, yetkinlik belgeleri ve değerlendirmeler.",
      "İletişim verileri: uygulama içi mesajlar, çağrı başvuruları ve tamamlanan iş geçmişi.",
      "Cihaz ve günlük verileri: işletim sistemi, uygulama çökme raporları, kullanım istatistikleri (anonimleştirilmiş).",
    ],
  },
  {
    icon: MapPin,
    title: "3. Konum Verilerinin Kullanımı",
    content: [
      "Konum bilgisi, yalnızca uygulamanın temel işlevselliği için (yakındaki çağrılar, rota oluşturma) kullanılır.",
      "Konum verisi üçüncü taraflarla paylaşılmaz; harita sağlayıcıları (örn. OpenStreetMap, OSRM) yalnızca görselleştirme ve rota hesaplama amacıyla anonim istek alabilir.",
      "Kullanıcı dilediği zaman cihaz ayarlarından konum iznini geri çekebilir; bu durumda bazı özellikler kısıtlanabilir.",
    ],
  },
  {
    icon: MessageSquare,
    title: "4. Verilerin İşlenme Amaçları",
    content: [
      "Kullanıcı hesabının oluşturulması ve yönetilmesi.",
      "Yardım çağrılarının eşleştirilmesi, mesajlaşma ve iş takibi.",
      "Güvenilirlik puanlaması, dolandırıcılık önleme ve platform güvenliği.",
      "Ödeme/kredi işlemlerinin kaydedilmesi ve faturalandırma desteği.",
      "Yasal yükümlülüklerin yerine getirilmesi ve resmi mercilerle paylaşım (yalnızca zorunlu hallerde).",
    ],
  },
  {
    icon: CreditCard,
    title: "5. Ödeme ve Kredi Verileri",
    content: [
      "Kredi satın alma işlemleri, uygulama mağazası ödeme altyapısı (RevenueCat / App Store / Google Play) üzerinden yürütülür.",
      "Platform, kullanıcıların banka kartı veya hesap bilgilerini doğrudan saklamaz.",
      "Satın alma geçmişi, iade ve destek süreçleri için gerekli süre boyunca saklanır.",
    ],
  },
  {
    icon: Eye,
    title: "6. Verilerin Paylaşılması",
    content: [
      "Profil adı, fotoğrafı, becerileri ve puanı, diğer kullanıcılar tarafından görülebilir.",
      "Telefon numarası ve e-posta adresi, yalnızca platform yönetimi ve yasal zorunluluklar dışında paylaşılmaz.",
      "Mesaj içerikleri şifrelenmiş veya en azından yetkisiz erişime karşı korunan altyapılarda saklanır.",
      "Üçüncü taraf analiz veya reklam sağlayıcılarıyla kişisel veri paylaşılmaz.",
    ],
  },
  {
    icon: Trash2,
    title: "7. Saklama Süreleri ve Haklarınız",
    content: [
      "Hesap verileri: hesabın silinmesine kadar saklanır.",
      "Tamamlanan iş ve mesaj geçmişi: yasal süreler ve uyuşmazlık çözümü için 3 yıl boyunca saklanabilir.",
      "KVKK kapsamında verilerinize erişme, düzeltme, silme ve işlemeye itiraz etme hakkınız vardır.",
      "Taleplerinizi makifergan@gmail.com adresine iletebilirsiniz; en kısa sürede yanıtlanacaktır.",
    ],
  },
  {
    icon: Mail,
    title: "8. İletişim",
    content: [
      "Gizlilik politikası, çerez kullanımı veya veri talepleri için: makifergan@gmail.com",
      "Politika zaman zaman güncellenebilir; güncel versiyon uygulama içinde yayımlanır.",
    ],
  },
];

const Privacy = () => {
  const t = useT();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background px-5 pb-8 pt-12 safe-top safe-bottom">
      <div className="mb-4 flex h-10 items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-20 items-center justify-center gap-1 rounded-full p-0 text-sm font-bold leading-none text-foreground transition-all active:scale-[0.98]"
        >
          <ChevronLeft size={18} className="text-primary" />
          <span className="leading-none">{t("Geri")}</span>
        </button>
      </div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-6"
      >
        <h1 className="mb-2 text-2xl font-black text-foreground">{t("Gizlilik Politikası")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Kişisel verilerinizin gizliliği ve güvenliği bizim için önemli.")}
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 space-y-4"
      >
        {sections.map((section, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border bg-card p-4 shadow-card"
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <section.icon size={18} />
              </div>
              <h2 className="text-base font-black text-foreground">{t(section.title)}</h2>
            </div>
            <ul className="space-y-2">
              {section.content.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{t(item)}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div className="rounded-2xl bg-secondary/5 p-4 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            {t("Son güncelleme")}: {new Date().toLocaleDateString("tr-TR")}
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Ergan Game&App — Bi' El At
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Privacy;
