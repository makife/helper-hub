import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Check, X, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  getPendingReferralCode,
  clearPendingReferralCode,
} from "@/lib/nativeAuth";

const skills = [
  { id: "ampul_takma" as const, label: "💡 Ampul Takma" },
  { id: "perde_asma" as const, label: "🪟 Perde Asma" },
  { id: "mobilya_monte" as const, label: "🪑 Mobilya Monte" },
  { id: "duvar_tamir" as const, label: "🔨 Duvar Tamir" },
  { id: "kucuk_tamir" as const, label: "🔧 Küçük Tamir" },
  { id: "tasima_yardimi" as const, label: "📦 Taşıma Yardımı" },
];

type SkillId = typeof skills[number]["id"];

const ProfileSetup = () => {
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<SkillId[]>([]);
  const [locationGranted, setLocationGranted] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);
  const [referralSubmitting, setReferralSubmitting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const code = getPendingReferralCode();
    if (!code) return;

    supabase
      .from("profiles")
      .select("referred_by, referral_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        // Kendi kodunla kendini davet edemez
        if (data.referral_code?.toUpperCase() === code) {
          clearPendingReferralCode();
          return;
        }
        if (data.referred_by) {
          clearPendingReferralCode();
          return;
        }
        setPendingReferralCode(code);
        setReferralDialogOpen(true);
      });
  }, [user]);

  const handleAcceptReferral = async () => {
    if (!pendingReferralCode || !user) return;
    setReferralSubmitting(true);

    const { data: referrer } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("referral_code", pendingReferralCode)
      .maybeSingle();

    if (!referrer) {
      toast.error("Geçersiz davet kodu.");
      setReferralSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.user_id })
      .eq("user_id", user.id);

    setReferralSubmitting(false);

    if (error) {
      toast.error("Davet kodu kaydedilemedi.");
      console.error(error);
      return;
    }

    clearPendingReferralCode();
    setReferralDialogOpen(false);
    toast.success("Davet kodu kabul edildi! İkinize de 1'er kredi hediye edildi. 🎉");
  };

  const handleSkipReferral = () => {
    clearPendingReferralCode();
    setReferralDialogOpen(false);
  };

  const handlePhotoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    };
    input.click();
  };

  const toggleSkill = (skillId: SkillId) => {
    setSelectedSkills((prev) =>
      prev.includes(skillId) ? prev.filter((s) => s !== skillId) : [...prev, skillId]
    );
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationGranted(true);
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          toast.error("Konum izni reddedildi");
          setLocationGranted(false);
        }
      );
    }
  };

  const isValid = name.trim().length >= 2 && avatarPreview;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setLoading(true);

    let avatarUrl: string | null = null;

    // Upload avatar
    if (avatarFile) {
      const ext = avatarFile.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { upsert: true });

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(path);
        avatarUrl = publicUrl;
      }
    }

    // Update profile
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        bio: bio.trim() || null,
        avatar_url: avatarUrl,
        skills: selectedSkills,
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
      })
      .eq("user_id", user.id);

    setLoading(false);

    if (error) {
      toast.error("Profil kaydedilemedi.");
      console.error(error);
      return;
    }

    toast.success("Profil oluşturuldu! 🎉");
    navigate("/home");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12 safe-top safe-bottom">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="mb-2 text-3xl font-black text-foreground">Profilini Oluştur</h1>
        <p className="mb-6 text-base text-muted-foreground">İnsanlar seni tanısın, güvensin.</p>
      </motion.div>

      <div className="flex-1 space-y-5 overflow-y-auto">
        {/* Photo */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="flex justify-center">
          <button onClick={handlePhotoUpload} className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-primary/40 bg-primary/5 transition-colors active:bg-primary/10">
            {avatarPreview ? (
              <>
                <img src={avatarPreview} alt="Profil" className="h-full w-full object-cover" />
                <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary">
                  <Check size={14} className="text-primary-foreground" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Camera size={24} className="text-primary" />
                <span className="text-[10px] font-bold text-primary">Fotoğraf *</span>
              </div>
            )}
          </button>
        </motion.div>

        {/* Name */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">Ad Soyad *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ahmet Yılmaz" className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-base font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary" />
        </motion.div>

        {/* Bio */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-foreground">
            Kısa Bio
            <span className="text-xs text-muted-foreground">{bio.length}/150</span>
          </label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} placeholder="Kendini kısaca tanıt..." rows={2} className="w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary" />
        </motion.div>

        {/* Skills */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          <label className="mb-2 block text-sm font-semibold text-foreground">Becerilerin</label>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <button key={skill.id} onClick={() => toggleSkill(skill.id)} className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all active:scale-95 ${selectedSkills.includes(skill.id) ? "gradient-warm text-primary-foreground shadow-soft" : "border border-border bg-card text-foreground"}`}>
                {skill.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Location */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <button onClick={requestLocation} className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98] ${locationGranted ? "border-success/30 bg-success/5" : "border-border bg-card"}`}>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${locationGranted ? "bg-success text-success-foreground" : "bg-primary/10 text-primary"}`}>
              <MapPin size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{locationGranted ? "Konum aktif ✓" : "Konumunu aç"}</p>
              <p className="text-xs text-muted-foreground">{locationGranted ? "Yakınındaki işleri görebilirsin" : "Yakınındaki işleri görmek için gerekli"}</p>
            </div>
          </button>
        </motion.div>
      </div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={handleSubmit}
        disabled={!isValid || loading}
        className="mt-4 gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-all active:scale-[0.98] disabled:opacity-40"
      >
        {loading ? "Kaydediliyor..." : "Profili Tamamla 🎉"}
      </motion.button>
    </div>
  );
};

export default ProfileSetup;
