import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  LogOut,
  Star,
  CheckCircle,
  Phone,
  User,
  MapPin,
  Camera,
  Pencil,
  Plus,
  Trash2,
  BadgeCheck,
  Coins,
  ShoppingBag,
  X,
  Check,
  Search,
  FileText,
  Shield,
  ChevronRight,
  Info,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import { ALL_SKILLS, searchSkills } from "@/lib/skillCatalog";

const LEGACY_SKILL_LABELS: Record<string, string> = {
  ampul_takma: "Ampul takma",
  perde_asma: "Perde asma",
  mobilya_monte: "Mobilya montajı",
  duvar_tamir: "Duvar tamiri",
  kucuk_tamir: "Küçük tamir",
  tasima_yardimi: "Taşıma yardımı",
};
type Credential = Tables<"credentials">;
type ReviewRow = Tables<"reviews"> & { reviewer?: { full_name: string; avatar_url: string | null } | null };

const Profile = () => {
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [profession, setProfession] = useState("");
  const [bio, setBio] = useState("");
  const [skillTags, setSkillTags] = useState<string[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSheetOpen, setAvatarSheetOpen] = useState(false);

  const [credOpen, setCredOpen] = useState(false);
  const [credTitle, setCredTitle] = useState("");
  const [credFile, setCredFile] = useState<File | null>(null);
  const [credPreview, setCredPreview] = useState<string | null>(null);
  const [credSaving, setCredSaving] = useState(false);
  const [credToDelete, setCredToDelete] = useState<Credential | null>(null);

  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const loadAll = useCallback(async () => {
    if (!user) return;
    const [{ data: p }, { data: c }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("credentials").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").eq("reviewee_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);

    setProfile(p);
    setCredentials(c || []);

    const reviewRows = (r || []) as ReviewRow[];
    if (reviewRows.length) {
      const ids = [...new Set(reviewRows.map((x) => x.reviewer_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ids);
      const map = new Map((profs || []).map((x) => [x.user_id, x]));
      reviewRows.forEach((row) => {
        const rp = map.get(row.reviewer_id);
        row.reviewer = rp ? { full_name: rp.full_name, avatar_url: rp.avatar_url } : null;
      });
    }
    setReviews(reviewRows);

    if (p) {
      setName(p.full_name || "");
      setProfession(p.profession || "");
      setBio(p.bio || "");
      const savedTags = p.skill_tags || [];
      setSkillTags(savedTags.length ? savedTags : (p.skills || []).map((skill) => LEGACY_SKILL_LABELS[skill] || skill));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const pickImage = (onPick: (file: File) => void, capture?: boolean) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    if (capture) input.setAttribute("capture", "user");
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) onPick(file);
    };
    input.click();
  };

  const uploadAvatar = (file: File) => {
    if (!user) return;
    setAvatarUploading(true);
    (async () => {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) {
        setAvatarUploading(false);
        toast.error("Fotoğraf yüklenemedi.");
        return;
      }
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: upErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("user_id", user.id);
      setAvatarUploading(false);
      if (upErr) {
        toast.error("Profil güncellenemedi.");
        return;
      }
      setProfile((prev) => (prev ? { ...prev, avatar_url: publicUrl } : prev));
      toast.success("Profil fotoğrafı güncellendi ✓");
    })();
  };

  const saveProfile = async () => {
    if (!user) return;
    if (name.trim().length < 2) {
      toast.error("İsim en az 2 karakter olmalı.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: name.trim(),
        profession: profession.trim() || null,
        bio: bio.trim() || null,
        skill_tags: skillTags,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Kaydedilemedi.");
      return;
    }
    setProfile((prev) =>
      prev
        ? { ...prev, full_name: name.trim(), profession: profession.trim() || null, bio: bio.trim() || null, skill_tags: skillTags }
        : prev
    );
    setEditing(false);
    toast.success("Profil güncellendi ✓");
  };

  const filteredSkillGroups = searchSkills(skillQuery);

  const MAX_SKILLS = 10;

  const toggleSkill = (skill: string) => {
    setSkillTags((prev) => {
      if (prev.includes(skill)) return prev.filter((item) => item !== skill);
      if (prev.length >= MAX_SKILLS) {
        toast.error(`En fazla ${MAX_SKILLS} beceri ekleyebilirsin`);
        return prev;
      }
      return [...prev, skill];
    });
  };

  const saveCredential = async () => {
    if (!user || credTitle.trim().length < 2) return;
    setCredSaving(true);
    let imageUrl: string | null = null;
    if (credFile) {
      const ext = credFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/credential_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("task-photos").upload(path, credFile);
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
      toast.error("Belge eklenemedi.");
      return;
    }
    setCredentials((prev) => [data, ...prev]);
    setCredOpen(false);
    setCredTitle("");
    setCredFile(null);
    setCredPreview(null);
    toast.success("Belge eklendi ✓");
  };

  const deleteCredential = async () => {
    if (!credToDelete) return;
    const { error } = await supabase.from("credentials").delete().eq("id", credToDelete.id);
    if (error) {
      toast.error("Silinemedi.");
      return;
    }
    setCredentials((prev) => prev.filter((c) => c.id !== credToDelete.id));
    setCredToDelete(null);
    toast.success("Belge silindi");
  };

  const requestLocation = () => {
    if (!("geolocation" in navigator) || !user) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { error } = await supabase.from("profiles").update({ latitude, longitude }).eq("user_id", user.id);
        setLocationLoading(false);
        if (error) {
          toast.error("Konum kaydedilemedi.");
          return;
        }
        setProfile((prev) => (prev ? { ...prev, latitude, longitude } : prev));
        toast.success("Konum güncellendi ✓");
      },
      () => {
        setLocationLoading(false);
        toast.error("Konum izni reddedildi");
      }
    );
  };

  const locationGranted = profile?.latitude != null && profile?.longitude != null;

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="flex-1 text-xl font-black text-foreground">Profil</h1>
        {!loading && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-xs font-bold text-primary shadow-card"
          >
            {editing ? <X size={14} /> : <Pencil size={14} />}
            {editing ? "Vazgeç" : "Düzenle"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex-1 px-5 pb-24">
          {/* Avatar + isim */}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-5 flex flex-col items-center">
            <button
              onClick={() => setAvatarSheetOpen(true)}
              disabled={avatarUploading}
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-muted disabled:opacity-60"
            >
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profil fotoğrafı" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={38} className="text-muted-foreground" />
              )}
              <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background gradient-warm text-primary-foreground">
                <Camera size={15} />
              </span>
            </button>
            {avatarUploading && <p className="mt-2 text-xs text-muted-foreground">Yükleniyor...</p>}

            {!editing && (
              <>
                <h2 className="mt-3 text-lg font-black text-foreground">{profile?.full_name || "İsimsiz Kullanıcı"}</h2>
                {profile?.profession && (
                  <p className="mt-0.5 text-sm font-bold text-primary">{profile.profession}</p>
                )}
                {profile?.phone && (
                  <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <Phone size={12} />
                    <span>{profile.phone}</span>
                  </div>
                )}
              </>
            )}
          </motion.div>

          {/* Sayaçlar */}
          <div className="mb-5 flex gap-3">
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <Star size={18} className="text-accent" />
              <p className="mt-1 text-lg font-black text-foreground">{Number(profile?.rating || 0).toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">Puan ({reviews.length})</p>
            </div>
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <CheckCircle size={18} className="text-primary" />
              <p className="mt-1 text-lg font-black text-foreground">{profile?.total_completed || 0}</p>
              <p className="text-[10px] text-muted-foreground">Tamamlanan</p>
            </div>
            <button
              onClick={() => navigate("/market")}
              className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card active:scale-[0.98]"
            >
              <Coins size={18} className="text-accent" />
              <p className="mt-1 text-lg font-black text-foreground">{profile?.credits ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Kredi</p>
            </button>
          </div>

          <button
            onClick={() => navigate("/market")}
            className="gradient-warm mb-5 flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-primary-foreground shadow-soft active:scale-[0.98]"
          >
            <ShoppingBag size={20} />
            <div className="flex-1">
              <p className="text-sm font-black">Kredi Marketi</p>
              <p className="text-xs opacity-90">İş kabul etmek için kredi yükle</p>
            </div>
          </button>

          {/* Düzenleme formu */}
          {editing ? (
            <div className="mb-5 space-y-3 rounded-2xl border border-border bg-card p-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">Ad Soyad</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">Meslek / Uzmanlık Alanı</label>
                <input
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="Örn: Elektrik Teknisyeni"
                  className="w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-muted-foreground">Hakkında</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, 300))}
                  rows={3}
                  placeholder="Kendinden kısaca bahset..."
                  className="w-full resize-none rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-bold text-muted-foreground">
                    Becerilerim ({skillTags.length}/10)
                  </label>

                  {skillTags.length > 0 && (
                    <button type="button" onClick={() => setSkillTags([])} className="text-xs font-bold text-muted-foreground">
                      Temizle
                    </button>
                  )}
                </div>

                {skillTags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {skillTags.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleSkill(s)}
                        className="gradient-warm flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-primary-foreground"
                      >
                        {s}
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
                    placeholder="Beceri ara (ör. musluk, boya, özel ders)"
                    className="w-full rounded-xl border-2 border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
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
                    <Plus size={14} />"{skillQuery.trim()}" becerisini ekle
                  </button>
                )}

                <div className="max-h-64 space-y-3 overflow-y-auto rounded-xl border-2 border-border bg-background p-3">
                  {filteredSkillGroups.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">Sonuç yok, kendin ekleyebilirsin.</p>
                  )}
                  {filteredSkillGroups.map((g) => (
                    <div key={g.id}>
                      <p className="mb-1.5 text-[11px] font-black uppercase tracking-wide text-muted-foreground">
                        {g.emoji} {g.label}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {g.skills.map((s) => {
                          const active = skillTags.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => toggleSkill(s)}
                              className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                                active ? "gradient-warm text-primary-foreground" : "border border-border bg-card text-foreground"
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="gradient-warm flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                <Check size={16} />
                {saving ? "Kaydediliyor..." : "Kaydet"}
              </button>
            </div>
          ) : (
            <>
              {profile?.bio && (
                <div className="mb-5 rounded-xl bg-card p-4 shadow-card">
                  <p className="text-xs font-semibold text-muted-foreground">Hakkında</p>
                  <p className="mt-1 text-sm text-foreground">{profile.bio}</p>
                </div>
              )}
              {((profile?.skill_tags?.length ?? 0) > 0 || (profile?.skills?.length ?? 0) > 0) && (
                <div className="mb-5 rounded-xl bg-card p-4 shadow-card">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    Becerilerim ({profile?.skill_tags?.length || profile?.skills?.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(profile?.skill_tags?.length ? profile.skill_tags : (profile?.skills || []).map((skill) => LEGACY_SKILL_LABELS[skill] || skill)).map((skill) => (
                      <span key={skill} className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Sertifikalar */}
          <div className="mb-5 rounded-2xl bg-card p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-sm font-black text-foreground">
                <BadgeCheck size={16} className="text-primary" />
                Yetkinlik Belgelerim
              </p>
              <button
                onClick={() => setCredOpen(true)}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary"
              >
                <Plus size={13} /> Ekle
              </button>
            </div>
            {credentials.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Henüz belge yok. Sertifikanı ekle, güvenilirliğini artır.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {credentials.map((c) => (
                  <div key={c.id} className="relative overflow-hidden rounded-xl border border-border">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.title} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center bg-muted">
                        <BadgeCheck size={24} className="text-muted-foreground" />
                      </div>
                    )}
                    <p className="px-2 py-2 text-xs font-bold text-foreground line-clamp-2">{c.title}</p>
                    <button
                      onClick={() => setCredToDelete(c)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Değerlendirmeler */}
          <div className="mb-5 rounded-2xl bg-card p-4 shadow-card">
            <p className="mb-3 flex items-center gap-1.5 text-sm font-black text-foreground">
              <Star size={16} className="text-accent" />
              Değerlendirmeler
            </p>
            {reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground">Henüz değerlendirme yok.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r) => (
                  <div key={r.id} className="flex gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                      {r.reviewer?.avatar_url ? (
                        <img src={r.reviewer.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User size={16} className="text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-foreground">{r.reviewer?.full_name || "Kullanıcı"}</p>
                        <div className="flex items-center gap-0.5 text-accent">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <Star key={i} size={11} fill="currentColor" />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="mt-0.5 text-xs text-muted-foreground">{r.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={requestLocation}
            disabled={locationLoading}
            className={`mb-5 flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98] disabled:opacity-60 ${locationGranted ? "border-success/30 bg-success/5" : "border-border bg-card"}`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${locationGranted ? "bg-success text-success-foreground" : "bg-primary/10 text-primary"}`}>
              <MapPin size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {locationLoading ? "Konum alınıyor..." : locationGranted ? "Konum aktif ✓" : "Konumunu aç"}
              </p>
              <p className="text-xs text-muted-foreground">
                {locationGranted ? "Yakınındaki işleri görebilirsin" : "Yakınındaki işleri görmek için gerekli"}
              </p>
            </div>
          </button>

          <div className="mb-5 space-y-2.5 rounded-2xl border border-border bg-card p-2 shadow-card">
            <button
              onClick={() => navigate("/terms")}
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Kullanım Koşulları</p>
                  <p className="text-[11px] text-muted-foreground">Hizmet şartları ve sorumluluklar</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>

            <div className="mx-3 h-px bg-border" />

            <button
              onClick={() => navigate("/privacy")}
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Shield size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Gizlilik Politikası</p>
                  <p className="text-[11px] text-muted-foreground">Kişisel verilerin korunması</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-muted-foreground" />
            </button>
          </div>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 text-sm font-bold text-destructive transition-all active:scale-[0.98]"
          >
            <LogOut size={16} />
            Çıkış Yap
          </button>

          <div className="mt-6 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/30 p-3">
            <Info size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-[10px] leading-4 text-muted-foreground">
              Harita verileri Esri, OpenStreetMap ve Leaflet katkılarıyla sunulmaktadır. Uydu görüntüleri ve yer isimleri ilgili sağlayıcıların lisanslarına tabidir.
            </p>
          </div>
        </div>
      )}

      {/* Belge ekleme sayfası */}
      {credOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-foreground/40 backdrop-blur-sm">
          <motion.div
            initial={{ y: 300 }}
            animate={{ y: 0 }}
            className="w-full rounded-t-3xl bg-card p-5 safe-bottom"
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-black text-foreground">Yetkinlik Belgesi Ekle</p>
              <button onClick={() => setCredOpen(false)} className="text-muted-foreground">
                <X size={20} />
              </button>
            </div>
            <label className="mb-1 block text-xs font-bold text-muted-foreground">Başlık</label>
            <input
              value={credTitle}
              onChange={(e) => setCredTitle(e.target.value)}
              placeholder="Örn: Elektrikçi Ustalık Belgesi"
              className="mb-3 w-full rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
            />
            <label className="mb-1 block text-xs font-bold text-muted-foreground">Görsel</label>
            <div className="mb-4 flex gap-2">
              {credPreview && (
                <img src={credPreview} alt="" className="h-20 w-20 rounded-xl object-cover" />
              )}
              <button
                onClick={() =>
                  pickImage((f) => {
                    setCredFile(f);
                    setCredPreview(URL.createObjectURL(f));
                  })
                }
                className="flex h-20 w-20 flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50"
              >
                <Camera size={18} className="text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Seç</span>
              </button>
            </div>
            <button
              onClick={saveCredential}
              disabled={credSaving || credTitle.trim().length < 2}
              className="gradient-warm w-full rounded-xl py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
            >
              {credSaving ? "Ekleniyor..." : "Belgeyi Ekle"}
            </button>
          </motion.div>
        </div>
      )}

      {/* Profil fotoğrafı seçim penceresi */}
      {avatarSheetOpen && (
        <div className="fixed inset-0 z-[1001] flex items-end justify-center bg-black/50" onClick={() => setAvatarSheetOpen(false)}>
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-card p-5 pb-8 safe-bottom"
          >
            <h3 className="mb-4 text-center text-base font-black text-foreground">Profil Fotoğrafı</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setAvatarSheetOpen(false); pickImage(uploadAvatar, true); }}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Camera size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Kamera ile Çek</p>
                  <p className="text-xs text-muted-foreground">Yeni bir fotoğraf çek</p>
                </div>
              </button>
              <button
                onClick={() => { setAvatarSheetOpen(false); pickImage(uploadAvatar); }}
                className="flex w-full items-center gap-3 rounded-2xl border-2 border-border bg-background px-4 py-3.5 text-left transition-all active:scale-[0.98]"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Plus size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Galeriden Seç</p>
                  <p className="text-xs text-muted-foreground">Mevcut bir fotoğrafı kullan</p>
                </div>
              </button>
              <button
                onClick={() => setAvatarSheetOpen(false)}
                className="mt-1 w-full rounded-2xl bg-muted py-3 text-sm font-bold text-muted-foreground transition-all active:scale-[0.98]"
              >
                Vazgeç
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmDialog
        open={!!credToDelete}
        title="Belgeyi sil"
        description={`"${credToDelete?.title ?? ""}" belgesini silmek istediğine emin misin?`}
        confirmLabel="Sil"
        onConfirm={deleteCredential}
        onCancel={() => setCredToDelete(null)}
      />
    </div>
  );
};

export default Profile;
