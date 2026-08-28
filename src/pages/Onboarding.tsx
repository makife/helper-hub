import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import onboarding1 from "@/assets/onboarding-1.png";
import onboarding2 from "@/assets/onboarding-2.png";
import onboarding3 from "@/assets/onboarding-3.png";

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
    } else {
      navigate("/welcome");
    }
  };

  const skip = () => navigate("/login");

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12 safe-top safe-bottom">
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
              alt={slides[current].title}
              width={280}
              height={280}
              className="mb-8"
            />
            <h2 className="mb-3 text-2xl font-black text-foreground">
              {slides[current].title}
            </h2>
            <p className="max-w-xs text-base text-muted-foreground leading-relaxed">
              {slides[current].desc}
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

      {/* Back / Skip controls */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={prev}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card px-5 py-3.5 text-sm font-bold text-foreground shadow-card transition-all active:scale-[0.98]"
        >
          <ChevronLeft size={18} className="text-primary" />
          Geri
        </button>
        <button
          onClick={skip}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground shadow-soft transition-all active:scale-[0.98]"
        >
          Atla
          <ChevronRight size={18} className="opacity-80" />
        </button>
      </div>

      {/* Main CTA */}
      <button
        onClick={next}
        className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]"
      >
        {current < slides.length - 1 ? "Devam" : "Hadi Başlayalım! 🚀"}
      </button>
    </div>
  );
};

export default Onboarding;
