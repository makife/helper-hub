import { compressImage } from "@/lib/imageCompress";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Check, X, UserPlus, Search, Plus, ImagePlus } from "lucide-react";
import { ALL_SKILLS, searchSkills } from "@/lib/skillCatalog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  getPendingReferralCode,
  clearPendingReferralCode,
} from "@/lib/nativeAuth";

const MAX_SKILLS = 10;

const ProfileSetup = () => {
  const t = useT();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [locationGranted, setLocationGranted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null);
  const [referralSubmitting, setReferralSubmitting] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [manualCodeApplied, setManualCodeApplied] = useState(false);
  const [manualCodeBusy, setManualCodeBusy] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mevcut profili forma yükle (18+ onayı eksik olan eski kullanıcılar
  // her şeyi baştan girmek zorunda kalmasın)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, bio, avatar_url, skills, latitude, longitude, age_confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.full_name) setName(data.full_name);
        if (data.bio) setBio(data.bio);
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
        if (Array.isArray(data.skills)) setSelectedSkills(data.skills.filter((s): s is string => typeof s === "string"));
        if (data.latitude != null && data.longitude != null) {
          setCoords({ lat: data.latitude, lng: data.longitude });
          setLocationGranted(true);
        }
        if (data.age_confirmed_at) setAgeConfirmed(true);
      });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const code = getPendingReferralCode();

    supabase
      .from("profiles")
      .select("referred_by, referral_code")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.referred_by) {
          clearPendingReferralCode();
          setManualCodeApplied(true);
          return;
        }
        if (!code) return;
        // Kendi kodunla kendini davet edemez
        if (data.referral_code?.toUpperCase() === code) {
          clearPendingReferralCode();
          return;
        }
        setManualCode(code);
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
      toast.error(t("Geçersiz davet kodu."));
      setReferralSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.user_id })
      .eq("user_id", user.id);

    setReferralSubmitting(false);

    if (error) {
      toast.error(t("Davet kodu kaydedilemedi."));
      console.error(error);
      return;
    }

    clearPendingReferralCode();
    setReferralDialogOpen(false);
    setManualCodeApplied(true);
    toast.success(t("Davet kodu kabul edildi! İkinize de 1'er kredi hediye edildi. 🎉"));
  };

  const handleApplyManualCode = async () => {
    const code = manualCode.trim().toUpperCase();
    if (!code || !user) return;
    setManualCodeBusy(true);

    const { data: me } = await supabase
      .from("profiles")
      .select("referral_code, referred_by")
      .eq("user_id", user.id)
      .maybeSingle();

    if (me?.referred_by) {
      setManualCodeBusy(false);
      setManualCodeApplied(true);
      toast.success(t("Davet kodu zaten kayıtlı."));
      return;
    }

    if (me?.referral_code?.toUpperCase() === code) {
      setManualCodeBusy(false);
      toast.error(t("Kendi davet kodunu kullanamazsın."));
      return;
    }

    const { data: referrer } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("referral_code", code)
      .maybeSingle();

    if (!referrer) {
      setManualCodeBusy(false);
      toast.error(t("Geçersiz davet kodu."));
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ referred_by: referrer.user_id })
      .eq("user_id", user.id);

    setManualCodeBusy(false);

    if (error) {
      toast.error(t("Davet kodu kaydedilemedi."));
      console.error(error);
      return;
    }

    clearPendingReferralCode();
    setManualCodeApplied(true);
    setReferralDialogOpen(false);
    toast.success(t("Davet kodu kabul edildi! İkinize de 1'er kredi hediye edildi. 🎉"));
  };

  const handleSkipReferral = () => {
    clearPendingReferralCode();
    setReferralDialogOpen(false);
  };

  const handlePhotoUpload = (source: "camera" | "gallery") => {
    setPhotoSheetOpen(false);
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (source === "camera") input.setAttribute("capture", "user");
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      }
    };
    input.click();
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      if (prev.includes(skill)) return prev.filter((s) => s !== skill);
      if (prev.length >= MAX_SKILLS) {
        toast.error(t("En fazla {count} beceri seçebilirsin.", { count: MAX_SKILLS }));
        return prev;
      }
      return [...prev, skill];
    });
  };

  const requestLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationGranted(true);
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          toast.error(t("Konum izni reddedildi"));
          setLocationGranted(false);
        }
      );
    }
  };

  const isValid = name.trim().length >= 2 && avatarPreview && ageConfirmed;

  const handleSubmit = async () => {
    if (!isValid || !user) return;
    setLoading(true);

    let avatarUrl: string | null = null;

    // Upload avatar
    if (avatarFile) {
      const blob = await compressImage(avatarFile, 512, 0.8);
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: "image/jpeg" });

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
        age_confirmed_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    setLoading(false);

    if (error) {
      toast.error(t("Profil kaydedilemedi."));
      console.error(error);
      return;
    }

    toast.success(t("Profil oluşturuldu! 🎉"));
    toast.success(t("Hoş geldin hediyesi: 5 kredi hesabına yüklendi! 🎁"));
    navigate("/home");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12 safe-top safe-bottom">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <h1 className="mb-2 text-3xl font-black text-foreground">{t("Profilini Oluştur")}</h1>
        <p className="mb-6 text-base text-muted-foreground">{t("İnsanlar seni tanısın, güvensin.")}</p>
      </motion.div>

      <div className="flex-1 space-y-5 overflow-y-auto">
        {/* Photo */}
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="flex justify-center">
          <button onClick={() => setPhotoSheetOpen(true)} className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-primary/40 bg-primary/5 transition-colors active:bg-primary/10">
            <div className="absolute inset-0 overflow-hidden rounded-full">
              {avatarPreview && <img src={avatarPreview} alt={t("Profil")} className="h-full w-full object-cover" />}
            </div>
            {!avatarPreview && (
              <div className="flex flex-col items-center gap-1">
                <Camera size={24} className="text-primary" />
                <span className="text-[10px] font-bold text-primary">{t("Fotoğraf *")}</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-soft">
              {avatarPreview ? <Check size={14} className="text-primary-foreground" /> : <Plus size={16} className="text-primary-foreground" />}
            </div>
          </button>
        </motion.div>

        {/* Name */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <label className="mb-1.5 block text-sm font-semibold text-foreground">{t("Ad Soyad *")}</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Ahmet Yılmaz")} className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-base font-semibold text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary" />
        </motion.div>

        {/* Bio */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <label className="mb-1.5 flex items-center justify-between text-sm font-semibold text-foreground">
            {t("Kısa Bio")}
            <span className="text-xs text-muted-foreground">{bio.length}/150</span>
          </label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 150))} placeholder={t("Kendini kısaca tanıt...")} rows={2} className="w-full resize-none rounded-xl border-2 border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary" />
        </motion.div>

        {/* Skills */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          <div className="mb-2 flex items-center justify-between">
            <label className="block text-sm font-semibold text-foreground">
              {t("Becerilerin ({count}/10)", { count: selectedSkills.length })}
            </label>
            {selectedSkills.length > 0 && (
              <button type="button" onClick={() => setSelectedSkills([])} className="text-xs font-bold text-muted-foreground">
                {t("Temizle")}
              </button>
            )}
          </div>
          {selectedSkills.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {selectedSkills.map((s) => (
                <button key={s} type="button" onClick={() => toggleSkill(s)} className="gradient-warm flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-soft">
                  {t(s)}
                  <X size={12} />
                </button>
              ))}
            </div>
          )}
          <div className="relative mb-2">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder={t("Beceri ara (ör. musluk, boya, özel ders)")}
              className="w-full rounded-xl border-2 border-border bg-card py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
            />
          </div>
          {skillQuery.trim().length > 1 && !ALL_SKILLS.some((s) => s.toLocaleLowerCase("tr-TR") === skillQuery.trim().toLocaleLowerCase("tr-TR")) && (
            <button
              type="button"
              onClick={() => {
                toggleSkill(skillQuery.trim());
                setSkillQuery("");
              }}
              className="mb-2 flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-border px-3 py-2.5 text-xs font-bold text-foreground"
            >
              <Plus size={14} />"{skillQuery.trim()}" {t("becerisini ekle")}
            </button>
          )}
          <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border-2 border-border bg-card p-3">
            {searchSkills(skillQuery).length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">{t("Sonuç yok, kendin ekleyebilirsin.")}</p>
            )}
            {searchSkills(skillQuery).map((g) => (
              <div key={g.id}>
                <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                  {g.emoji} {t(g.label)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.skills.map((s) => {
                    const active = selectedSkills.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${active ? "gradient-warm text-primary-foreground" : "border border-border bg-background text-foreground"}`}
                      >
                        {t(s)}
                      </button>
                    );
                  })}
                </div>
              </div>
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
              <p className="text-sm font-bold text-foreground">{locationGranted ? t("Konum aktif ✓") : t("Konumunu aç")}</p>
              <p className="text-xs text-muted-foreground">{locationGranted ? t("Yakınındaki işleri görebilirsin") : t("Yakınındaki işleri görmek için gerekli")}</p>
            </div>
          </button>
        </motion.div>

        {/* Davet kodu */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
          <label className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserPlus size={16} className="text-primary" />
            {t("Davet kodun var mı?")}
          </label>
          {manualCodeApplied ? (
            <div className="flex items-center gap-2 rounded-xl border-2 border-success/30 bg-success/5 px-4 py-3 text-sm font-bold text-foreground">
              <Check size={16} className="text-success" />
              {t("Davet kodu uygulandı")}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase().slice(0, 12))}
                placeholder={t("Örn. ABC123")}
                autoCapitalize="characters"
                className="w-full flex-1 rounded-xl border-2 border-border bg-card px-4 py-3 text-base font-bold tracking-widest text-foreground outline-none transition-colors placeholder:text-sm placeholder:font-semibold placeholder:tracking-normal placeholder:text-muted-foreground/50 focus:border-primary"
              />
              <button
                onClick={handleApplyManualCode}
                disabled={manualCodeBusy || manualCode.trim().length < 3}
                className="shrink-0 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-40"
              >
                {manualCodeBusy ? t("...") : t("Uygula")}
              </button>
            </div>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            {t("Seni davet edenin kodunu gir, ikinize de 1'er kredi hediye.")}
          </p>
        </motion.div>

        {/* 18+ onayı */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
          <button
            onClick={() => setAgeConfirmed((v) => !v)}
            className={`flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98] ${ageConfirmed ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}
          >
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${ageConfirmed ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
              {ageConfirmed && <Check size={14} />}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{t("18 yaşından büyük olduğumu onaylıyorum *")}</p>
              <p className="text-xs text-muted-foreground">{t("Platformda iş açmak ve iş almak için 18 yaş şartı vardır.")}</p>
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
        {loading ? t("Kaydediliyor...") : t("Profili Tamamla 🎉")}
      </motion.button>

      <AnimatePresence>
        {referralDialogOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm overflow-hidden rounded-3xl bg-card p-6 shadow-xl"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-foreground">{t("Arkadaşın seni davet etti")}</h3>
                  <p className="text-xs text-muted-foreground">{t("Davet kodunu kabul edersen ikinize de 1'er kredi hediye.")}</p>
                </div>
              </div>

              <div className="mb-5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-center">
                <p className="text-xs font-semibold text-muted-foreground">Davet kodu</p>
                <p className="text-2xl font-black tracking-widest text-primary">{pendingReferralCode}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipReferral}
                  className="flex-1 rounded-2xl border-2 border-border bg-card py-3 text-sm font-bold text-foreground transition-all active:scale-[0.98]"
                >
                  Sonra
                </button>
                <button
                  onClick={handleAcceptReferral}
                  disabled={referralSubmitting}
                  className="flex-1 rounded-2xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {referralSubmitting ? "Kaydediliyor..." : "Kabul Et"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileSetup;
