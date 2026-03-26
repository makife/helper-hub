import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { Camera, MapPin, Check } from "lucide-react";

const skills = [
  "💡 Ampul Takma",
  "🪟 Perde Asma",
  "🪑 Mobilya Monte",
  "🔨 Duvar Tamir",
  "🔧 Küçük Tamir",
  "📦 Taşıma Yardımı",
];

const ProfileSetup = () => {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const role = (location.state as any)?.role || "owner";
  const isTasker = role === "tasker";

  const handlePhotoUpload = () => {
    // Simulate photo upload
    setPhoto("https://api.dicebear.com/7.x/avataaars/svg?seed=bielat");
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationGranted(true),
        () => setLocationGranted(false)
      );
    }
  };

  const isValid = name.trim().length >= 2 && photo;

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12 safe-top safe-bottom">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 className="mb-2 text-3xl font-black text-foreground">Profilini Oluştur</h1>
        <p className="mb-6 text-base text-muted-foreground">
          İnsanlar seni tanısın, güvensin.
        </p>
      </motion.div>

      <div className="flex-1 space-y-5 overflow-y-auto">
        {/* Photo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex justify-center"
        >
          <button
            onClick={handlePhotoUpload}
            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-primary/40 bg-primary/5 transition-colors active:bg-primary/10"
          >
            {photo ? (
              <>
                <img src={photo} alt="Profil" className="h-full w-full object-cover" />
                <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                  <Check size={14} className="text-primary-foreground" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera size={24} className="text-primary" />
                <span className="text-[10px] font-bold text-primary">Fotoğraf</span>
              </div>
            )}
          </button>
        </motion.div>

        {/* Name */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Ad Soyad *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ahmet Yılmaz"
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-base font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
          />
        </motion.div>

        {/* Bio */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-foreground">
            Kısa Bio
            <span className="text-xs text-muted-foreground">{bio.length}/150</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 150))}
            placeholder="Kendini kısaca tanıt..."
            rows={2}
            className="w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary"
          />
        </motion.div>

        {/* Skills (Tasker only) */}
        {isTasker && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
            <label className="mb-2 block text-sm font-semibold text-foreground">Becerilerin</label>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill}
                  onClick={() => toggleSkill(skill)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all active:scale-95 ${
                    selectedSkills.includes(skill)
                      ? "gradient-warm text-primary-foreground shadow-soft"
                      : "border border-border bg-card text-foreground"
                  }`}
                >
                  {skill}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Location */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <button
            onClick={requestLocation}
            className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98] ${
              locationGranted
                ? "border-success/30 bg-success/5"
                : "border-border bg-card"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                locationGranted ? "bg-success text-success-foreground" : "bg-primary/10 text-primary"
              }`}
            >
              <MapPin size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {locationGranted ? "Konum aktif ✓" : "Konumunu aç"}
              </p>
              <p className="text-xs text-muted-foreground">
                {locationGranted
                  ? "Yakınındaki işleri görebilirsin"
                  : "Yakınındaki işleri görmek için gerekli"}
              </p>
            </div>
          </button>
        </motion.div>
      </div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => navigate("/home")}
        disabled={!isValid}
        className="mt-4 gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-all active:scale-[0.98] disabled:opacity-40"
      >
        Profili Tamamla 🎉
      </motion.button>
    </div>
  );
};

export default ProfileSetup;
