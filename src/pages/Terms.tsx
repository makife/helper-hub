import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Scale, Shield, AlertCircle, Coins, MessageSquare, Star, FileText } from "lucide-react";

const sections = [
  {
    icon: Scale,
    title: "1. Taraflar ve Tanımlar",
    content: [
      "Bi' El At, Ergan Game&App tarafından işletilen bir yardımlaşma ve komşuluk platformudur.",
      "'Yardım Çağrısı Açan' (işveren), uygulama üzerinden destek talebinde bulunan kullanıcıdır.",
      "'El Atan' (yardımcı), açılan çağrıya başvurarak destek sağlayan kullanıcıdır.",
      "Platform yalnızca kullanıcıları bir araya getiren bir aracıdır; tarafların kendi aralarındaki ilişkide taraf değildir.",
    ],
  },
  {
    icon: Shield,
    title: "2. Hizmetin Kapsamı",
    content: [
      "Uygulama, kullanıcıların yerel komşuluk çerçevesinde küçük işler, tamirat, taşıma ve benzeri günlük yardım taleplerini paylaşmasını sağlar.",
      "Platform, kullanıcı profillerini, konum bilgilerini, mesajlaşma ve değerlendirme araçlarını sunar.",
      "Bi' El At, gerçekleşen işin niteliği, süresi, bedeli veya tarafların davranışları üzerinde doğrudan kontrol sahibi değildir.",
    ],
  },
  {
    icon: AlertCircle,
    title: "3. Sorumluluk Reddi",
    content: [
      "Taraflar arasında doğabilecek uyuşmazlıklarda, hasar, gecikme, kalite sorunu veya ödeme anlaşmazlıklarında Bi' El At ve Ergan Game&App sorumlu tutulamaz.",
      "Yardım Çağrısı Açan ve El Atan, işin şartlarını (süre, ücret, yapılacaklar) kendi aralarında netleştirir.",
      "Platform üzerinde gerçekleşen işlemler tamamen kullanıcıların kendi sorumluluğundadır.",
      "Bi' El At, kullanıcıların kimlik, yetkinlik veya belgelerini garanti etmez; profilde paylaşılan bilgilerin doğruluğu kullanıcıya aittir.",
    ],
  },
  {
    icon: Coins,
    title: "4. Kredi ve Ödeme",
    content: [
      "El Atan'ın bir çağrıya başvurabilmesi için yeterli krediye sahip olması gerekir.",
      "Krediler uygulama içi satın alma yollarıyla temin edilir ve iade koşulları satın alma sırasında belirtilir.",
      "Platform, kullanıcılar arası doğrudan ödeme veya nakit transferi yapmaz; bu tür düzenlemeler tarafların kendi inisiyatifindedir.",
      "Kötüye kullanım, dolandırıcılık veya sahte çağrı tespit edilen hesaplarda kredi ve hesap dondurma işlemi uygulanabilir.",
    ],
  },
  {
    icon: MessageSquare,
    title: "5. Davranış Kuralları",
    content: [
      "Kullanıcılar birbirine karşı saygılı ve güvenli iletişim kurmakla yükümlüdür.",
      "Ayrımcı, taciz edici, tehditkar veya yasa dışı içerik paylaşımı yasaktır.",
      "Sahte çağrı, spam veya platformu kötüye kullanan hesaplar kalıcı olarak engellenebilir.",
      "Kullanıcılar, gerçekleştirdikleri işle ilgili dürüst değerlendirme yapmakla yükümlüdür.",
    ],
  },
  {
    icon: Star,
    title: "6. Değerlendirme ve İçerik",
    content: [
      "Tamamlanan işlerde çift onaylı değerlendirme sistemi kullanılır.",
      "Yapılan yorumlar ve puanlar kamusal bir güvenilirlik kaynağıdır; silinmesi talep edilse de platform, yasalara aykırı olmadığı sürece içeriği saklayabilir.",
      "Kullanıcılar, paylaştıkları fotoğraf, belge ve metinlerin kendilerine ait olduğunu ve yasalara uygun olduğunu kabul eder.",
    ],
  },
  {
    icon: FileText,
    title: "7. Değişiklikler ve İletişim",
    content: [
      "Bu koşullar önceden bildirmeksizin güncellenebilir; güncel versiyon uygulama içinde veya web sitesinde yayımlanır.",
      "Hizmeti kullanmaya devam eden kullanıcı, güncel koşulları kabul etmiş sayılır.",
      "Sorularınız için makifergan@gmail.com adresine yazabilirsiniz.",
    ],
  },
];

const Terms = () => {
  const { t, lang } = useI18n();
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
        <h1 className="mb-2 text-2xl font-black text-foreground">{t("Kullanım Koşulları")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Bi' El At uygulamasını kullanarak aşağıdaki şartları kabul etmiş olursunuz.")}
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
            {t("Son güncelleme")}: {new Date().toLocaleDateString(lang === "en" ? "en-US" : "tr-TR")}
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Ergan Game&App — Bi' El At
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Terms;
