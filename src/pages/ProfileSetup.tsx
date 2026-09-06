import { compressImage } from "@/lib/imageCompress";
import { useEffect, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Camera, MapPin, Check, X, UserPlus, Search, Plus, ImagePlus, BadgeCheck, Trash2, ChevronDown, ShieldCheck } from "lucide-react";
import { ALL_SKILLS, searchSkills } from "@/lib/skillCatalog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  getPendingReferralCode,
  clearPendingReferralCode,
} from "@/lib/nativeAuth";

type Credential = Tables<"credentials">;

const MAX_SKILLS = 10;

const LEGACY_SKILL_LABELS: Record<string, string> = {
  ampul_takma: "Ampul takma",
  perde_asma: "Perde asma",
  mobilya_monte: "Mobilya montajı",
  duvar_tamir: "Duvar tamiri",
  kucuk_tamir: "Küçük tamir",
  tasima_yardimi: "Taşıma yardımı",
};

const ProfileSetup = () => {
  const { t, lang, setLang } = useI18n();
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
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [credOpen, setCredOpen] = useState(false);
  const [credTitle, setCredTitle] = useState("");
  const [credFile, setCredFile] = useState<File | null>(null);
  const [credPreview, setCredPreview] = useState<string | null>(null);
  const [credSaving, setCredSaving] = useState(false);
  const [credToDelete, setCredToDelete] = useState<Credential | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [pendingLang, setPendingLang] = useState<"tr" | "en" | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Mevcut profili forma yükle (18+ onayı eksik olan eski kullanıcılar
  // her şeyi baştan girmek zorunda kalmasın)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, bio, avatar_url, skills, skill_tags, latitude, longitude, age_confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        if (data.full_name?.trim() && data.age_confirmed_at) {
          sessionStorage.setItem(`profile-completed:${user.id}`, "true");
          navigate("/home", { replace: true });
          return;
        }
        if (data.full_name) setName(data.full_name);
        if (data.bio) setBio(data.bio);
        if (data.avatar_url) setAvatarPreview(data.avatar_url);
        else {
          const meta = user.user_metadata as { avatar_url?: string; picture?: string } | undefined;
          const googlePhoto = meta?.avatar_url || meta?.picture;
          if (googlePhoto) setAvatarPreview(googlePhoto);
        }
        const savedTags = Array.isArray(data.skill_tags) ? data.skill_tags.filter((s): s is string => typeof s === "string") : [];
        const legacy = Array.isArray(data.skills) ? data.skills.map((s) => LEGACY_SKILL_LABELS[s] || s) : [];
        const merged = savedTags.length ? savedTags : legacy;
        if (merged.length) setSelectedSkills(merged);
        if (data.latitude != null && data.longitude != null) {
          setCoords({ lat: data.latitude, lng: data.longitude });
          setLocationGranted(true);
        }
        if (data.age_confirmed_at) setAgeConfirmed(true);
      });

    supabase
      .from("credentials")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setCredentials(data || []));
  }, [navigate, user]);

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

  const pickCredImage = (capture?: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) input.setAttribute("capture", "environment");
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setCredFile(file);
        setCredPreview(URL.createObjectURL(file));
      }
    };
    input.click();
  };

  const saveCredential = async () => {
    if (!user || credTitle.trim().length < 2) return;
    if (credentials.length >= 5) {
      toast.error(t("En fazla 5 yetkinlik belgesi yükleyebilirsin."));
      return;
    }
    setCredSaving(true);
    let imageUrl: string | null = null;
    if (credFile) {
      const blob = await compressImage(credFile, 1280, 0.75);
      const path = `${user.id}/credential_${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("task-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (!error) {
        imageUrl = supabase.storage.from("task-photos").getPublicUrl(path).data.publicUrl;
      }
    }
    const { data, error } = await supabase
      .from("credentials")
      .insert({ user_id: user.id, title: credTitle.trim(), image_url: imageUrl })
      .select()
      .single();
    setCredSaving(false);
    if (error || !data) {
      toast.error(t("Belge eklenemedi."));
      return;
    }
    setCredentials((prev) => [data, ...prev]);
    setCredOpen(false);
    setCredTitle("");
    setCredFile(null);
    setCredPreview(null);
    toast.success(t("Belge eklendi ✓"));
  };

  const deleteCredential = async () => {
    if (!credToDelete) return;
    const { error } = await supabase.from("credentials").delete().eq("id", credToDelete.id);
    if (error) {
      toast.error(t("Silinemedi."));
      return;
    }
    setCredentials((prev) => prev.filter((c) => c.id !== credToDelete.id));
    setCredToDelete(null);
    toast.success(t("Belge silindi"));
  };

  const changeLanguage = async (next: "tr" | "en") => {
    setLang(next);
    if (user) {
      const { error } = await supabase.from("profiles").update({ language: next }).eq("user_id", user.id);
      if (error) toast.error(t("Dil tercihi kaydedilemedi."));
    }
  };

  const flags: Record<string, ReactNode> = {
    tr: (
      <svg viewBox="0 0 640 480" className="h-4 w-auto rounded-sm">
        <rect width="640" height="480" fill="#E30A17" />
        <circle cx="220" cy="240" r="120" fill="#FFFFFF" />
        <circle cx="256" cy="240" r="96" fill="#E30A17" />
        <path
          d="M520.6,240 L483.8,266.8 L497.9,310.2 L461.1,283.4 L424.3,310.2 L438.4,266.8 L401.6,240 L447.1,240 L461.1,196.6 L475.2,240 Z"
          fill="#FFFFFF"
        />
      </svg>
    ),
    en: (
      <svg viewBox="0 0 640 480" className="h-4 w-auto rounded-sm">
        <rect width="640" height="480" fill="#012169" />
        <path d="M0 0 L640 480 M640 0 L0 480" stroke="#FFFFFF" strokeWidth="60" />
        <path d="M0 0 L640 480 M640 0 L0 480" stroke="#C8102E" strokeWidth="40" />
        <path d="M320 0 V480 M0 240 H640" stroke="#FFFFFF" strokeWidth="100" />
        <path d="M320 0 V480 M0 240 H640" stroke="#C8102E" strokeWidth="60" />
      </svg>
    ),
  };

  const langOptions = [
    { code: "tr" as const, label: lang === "en" ? "Turkish" : "Türkçe" },
    { code: "en" as const, label: "English" },
  ];

  const isValid = name.trim().length >= 2 && ageConfirmed;

  const handleSubmit = async () => {
    if (!user) return;
    if (name.trim().length < 2) {
      toast.error(t("Lütfen adını ve soyadını yaz."));
      return;
    }
    if (!ageConfirmed) {
      toast.error(t("Devam etmek için 18 yaşından büyük olduğunu onaylaman gerekiyor."));
      return;
    }
    setLoading(true);

    // Yeni fotoğraf yoksa mevcut fotoğraf korunur (eskiden null'lanıyordu)
    let avatarUrl: string | null = avatarPreview && !avatarPreview.startsWith("data:") ? avatarPreview : null;

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
        skill_tags: selectedSkills,
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
    // Korumalı sayfa kontrolünü anında güncelle; aksi halde yeni kaydı
    // okumadan önce kullanıcı tekrar profil kurulumuna dönebiliyordu.
    sessionStorage.setItem(`profile-completed:${user.id}`, "true");
    navigate("/home", { replace: true });
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
                <span className="text-[10px] font-bold text-primary">{t("Fotoğraf")}</span>
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

        {/* Yetkinlik Belgeleri */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.27 }} className="rounded-2xl bg-card p-4 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-black text-foreground">
              <BadgeCheck size={16} className="text-primary" />
              {t("Yetkinlik Belgelerim")} ({credentials.length}/5)
            </p>
            <button
              type="button"
              onClick={() => setCredOpen(true)}
              disabled={credentials.length >= 5}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary disabled:opacity-40"
            >
              <Plus size={13} /> {t("Ekle")}
            </button>
          </div>
          {credentials.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("Henüz belge yok. En fazla 5 belge ekleyebilirsin.")}
            </p>
          ) : (
            <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
              <div className="flex gap-3 pb-2">
                {credentials.map((c) => (
                  <div key={c.id} className="relative min-w-[180px] max-w-[180px] overflow-hidden rounded-xl border border-border">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.title} className="h-36 w-full object-cover" />
                    ) : (
                      <div className="flex h-36 w-full items-center justify-center bg-muted">
                        <BadgeCheck size={28} className="text-muted-foreground" />
                      </div>
                    )}
                    <p className="px-2 py-2 text-xs font-bold text-foreground line-clamp-2">{c.title}</p>
                    <button
                      type="button"
                      onClick={() => setCredToDelete(c)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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

        {/* Dil seçimi */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.38 }} className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-black text-foreground">{t("Uygulama Dili")}</p>
              <p className="text-xs text-muted-foreground">{t("Dil / Language")}</p>
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-black text-foreground shadow-sm"
              >
                <span className="flex items-center">{flags[lang]}</span>
                <span>{lang.toUpperCase()}</span>
                <ChevronDown size={14} className={`transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    variants={{
                      hidden: { opacity: 0, scaleY: 0.6, originY: 0 },
                      visible: { opacity: 1, scaleY: 1, originY: 0 },
                    }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute right-0 top-full z-20 mt-1 flex w-36 origin-top flex-col rounded-xl border border-border bg-card p-1 shadow-lg"
                  >
                    {langOptions.map((o, i) => (
                      <motion.button
                        key={o.code}
                        custom={i}
                        variants={{
                          hidden: { opacity: 0, y: -12 },
                          visible: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.2, delay: i * 0.06, ease: "easeOut" }}
                        onClick={() => {
                          if (o.code !== lang) setPendingLang(o.code);
                          setLangOpen(false);
                        }}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition-colors ${
                          lang === o.code
                            ? "gradient-warm text-primary-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="flex items-center">{flags[o.code]}</span>
                        <span>{o.label}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
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

          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-card p-3.5">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-bold text-foreground">{t("Güvenini artır (isteğe bağlı)")}</p>
              <p className="text-xs text-muted-foreground">
                {t("Profilini oluşturduktan sonra kimlik, adli sicil ve meslek belgeni yükleyerek 5 yıldıza kadar güven rozeti kazanabilirsin.")}
              </p>
            </div>
          </div>
        </motion.div>
      </div>



      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={handleSubmit}
        disabled={loading}
        className={`mt-4 gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-all active:scale-[0.98] disabled:opacity-40 ${!isValid ? "opacity-60" : ""}`}
      >
        {loading ? t("Kaydediliyor...") : t("Profili Tamamla")}
      </motion.button>

      <AnimatePresence>
        {photoSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPhotoSheetOpen(false)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-t-3xl bg-card p-6 pb-8 shadow-xl safe-bottom"
            >
              <h3 className="mb-4 text-center text-base font-black text-foreground">{t("Profil fotoğrafı")}</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handlePhotoUpload("camera")}
                  className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-left transition-all active:scale-[0.98]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Camera size={20} />
                  </div>
                  <span className="text-sm font-bold text-foreground">{t("Fotoğraf Çek")}</span>
                </button>
                <button
                  onClick={() => handlePhotoUpload("gallery")}
                  className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-left transition-all active:scale-[0.98]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ImagePlus size={20} />
                  </div>
                  <span className="text-sm font-bold text-foreground">{t("Galeriden Seç")}</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Belge ekleme penceresi */}
      {credOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/40 backdrop-blur-sm">
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            className="w-full rounded-t-3xl bg-card p-5 safe-bottom"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-black text-foreground">{t("Yetkinlik Belgesi Ekle")}</p>
              <button onClick={() => setCredOpen(false)} className="text-muted-foreground">
                <X size={20} />
              </button>
            </div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">{t("Başlık")}</label>
            <input
              value={credTitle}
              onChange={(e) => setCredTitle(e.target.value)}
              placeholder={t("Örn: Elektrikçi Ustalık Belgesi")}
              className="mb-3 w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
            />
            <label className="mb-1 block text-xs font-bold text-muted-foreground">{t("Görsel")}</label>
            <div className="mb-4 flex gap-2">
              {credPreview && (
                <img src={credPreview} alt="" className="h-20 w-20 rounded-xl object-cover" />
              )}
              <button
                type="button"
                onClick={() => pickCredImage(true)}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50"
              >
                <Camera size={18} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{t("Çek")}</span>
              </button>
              <button
                type="button"
                onClick={() => pickCredImage()}
                className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50"
              >
                <ImagePlus size={18} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">{t("Galeri")}</span>
              </button>
            </div>
            <button
              onClick={saveCredential}
              disabled={credSaving || credTitle.trim().length < 2}
              className="gradient-warm w-full rounded-xl py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {credSaving ? t("Ekleniyor...") : t("Belgeyi Ekle")}
            </button>
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        open={!!credToDelete}
        title={t("Belgeyi sil")}
        description={t('"{title}" belgesini silmek istediğine emin misin?', { title: credToDelete?.title ?? "" })}
        confirmLabel={t("Sil")}
        onConfirm={deleteCredential}
        onCancel={() => setCredToDelete(null)}
      />

      <ConfirmDialog
        open={!!pendingLang}
        title={t("Dil Değiştir")}
        description={t("Uygulama dilini {lang} olarak değiştirmek istiyor musunuz?", {
          lang: pendingLang === "tr" ? t("Türkçe") : t("İngilizce"),
        })}
        confirmLabel={t("Değiştir")}
        cancelLabel={t("Vazgeç")}
        onConfirm={() => {
          if (pendingLang) {
            void changeLanguage(pendingLang);
          }
          setPendingLang(null);
        }}
        onCancel={() => setPendingLang(null)}
      />
    </div>
  );
};

export default ProfileSetup;
