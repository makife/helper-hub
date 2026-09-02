import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import onboarding1 from "@/assets/onboarding-1.png";
import onboarding2 from "@/assets/onboarding-2.png";
import onboarding3 from "@/assets/onboarding-3.png";
import { useT } from "@/lib/i18n";

const slides = [
  {
    image: onboarding1,
    title: "Komşudan Yardım Al",
    desc: "Ampul takma, mobilya monte, küçük tamir... Yakınındaki yetenekli insanlardan hızlıca yardım al.",
  },
  {
    image: onboarding2,
    title: "Haritadan Keşfet",
    desc: "Canlı haritada yakınındaki işleri gör, sana uygun olanı kabul et ve hemen kazanmaya başla.",
  },
  {
    image: onboarding3,
    title: "Güvenle Çalış",
    desc: "Karşılıklı puan sistemi, doğrulanmış profiller ve güvenli iletişim ile huzurla çalış.",
  },
];

const Onboarding = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const t = useT();

  const next = () => {
    if (current < slides.length - 1) {
      setCurrent(current + 1);
    } else {
      navigate("/login");
    }
  };

  const prev = () => {
    if (current > 0) {
      setCurrent(current - 1);
    }
  };

  const skip = () => navigate("/login");

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12 safe-top safe-bottom">
      {/* Back / Skip controls */}
      <div className="mb-2 mt-2 grid h-10 grid-cols-2 items-center">
        {current > 0 ? (
          <button
            onClick={prev}
            className="flex h-10 w-20 items-center justify-center gap-1 justify-self-start rounded-full p-0 text-sm font-bold leading-none text-foreground transition-all active:scale-[0.98]"
          >
            <ChevronLeft size={18} className="text-primary" />
            <span className="leading-none">{t("Geri")}</span>
          </button>
        ) : (
          <div className="h-10 w-20" aria-hidden="true" />
        )}
        <button
          onClick={skip}
          className="flex h-10 w-20 items-center justify-center gap-1 justify-self-end rounded-full p-0 text-sm font-bold leading-none text-primary transition-all active:scale-[0.98]"
        >
          <span className="leading-none">{t("Atla")}</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center text-center"
          >
            <img
              src={slides[current].image}
              alt={t(slides[current].title)}
              width={280}
              height={280}
              className="mb-8"
            />
            <h2 className="mb-3 text-2xl font-black text-foreground">
              {t(slides[current].title)}
            </h2>
            <p className="max-w-xs text-base text-muted-foreground leading-relaxed">
              {t(slides[current].desc)}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dots */}
      <div className="mb-6 flex justify-center gap-2">
        {slides.map((_, i) => (
          <div
            key={i}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? "w-8 bg-primary"
                : "w-2 bg-border"
            }`}
          />
        ))}
      </div>

      {/* Main CTA */}
      <button
        onClick={next}
        className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]"
      >
        {current < slides.length - 1 ? "Devam" : "Hadi Başlayalım!"}
      </button>
    </div>
  );
};

export default Onboarding;
