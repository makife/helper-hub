import { useI18n } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, CheckCircle, Phone, User, BadgeCheck, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { timeAgoIn } from "@/lib/dateFormat";

const SKILL_LABELS: Record<string, string> = {
  ampul_takma: "💡 Ampul Takma",
  perde_asma: "🪟 Perde Asma",
  mobilya_monte: "🪑 Mobilya Monte",
  duvar_tamir: "🔨 Duvar Tamir",
  kucuk_tamir: "🔧 Küçük Tamir",
  tasima_yardimi: "📦 Taşıma Yardımı",
};

type ReviewRow = Tables<"reviews"> & { reviewer?: { full_name: string; avatar_url: string | null } | null };

const initials = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};

const UserProfile = () => {
  const { t, lang } = useI18n();
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [credentials, setCredentials] = useState<Tables<"credentials">[]>([]);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const [{ data: p }, { data: c }, { data: r }] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("credentials").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("reviews").select("*").eq("reviewee_id", userId).order("created_at", { ascending: false }).limit(10),
      ]);
      setProfile(p);
      setCredentials(c || []);

      const rows = (r || []) as ReviewRow[];
      if (rows.length) {
        const ids = [...new Set(rows.map((x) => x.reviewer_id))];
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name, avatar_url")
          .in("user_id", ids);
        const map = new Map((profs || []).map((x) => [x.user_id, x]));
        rows.forEach((row) => {
          const rp = map.get(row.reviewer_id);
          row.reviewer = rp ? { full_name: rp.full_name, avatar_url: rp.avatar_url } : null;
        });
      }
      const sorted = [...rows].sort((a, b) => {
        const aHasComment = a.comment ? 1 : 0;
        const bHasComment = b.comment ? 1 : 0;
        if (aHasComment !== bHasComment) return bHasComment - aHasComment;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setReviews(sorted);
      setLoading(false);
    };
    load();
  }, [userId]);

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">{t("Profil")}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : !profile ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">{t("Kullanıcı bulunamadı")}</p>
        </div>
      ) : (
        <div className="flex-1 px-5 pb-24">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-5 flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={`${profile.full_name} profil fotoğrafı`} className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={36} className="text-muted-foreground" />
              )}
            </div>
            <h2 className="mt-3 text-lg font-black text-foreground">{profile.full_name || t("İsimsiz Kullanıcı")}</h2>
            {profile.profession && <p className="mt-0.5 text-sm font-bold text-primary">{profile.profession}</p>}
            {profile.phone && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Phone size={12} />
                <span>{profile.phone}</span>
              </div>
            )}
          </motion.div>

          <div className="mb-5 flex gap-3">
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <Star size={18} className="text-accent" />
              <p className="mt-1 text-lg font-black text-foreground">{Number(profile.rating || 0).toFixed(1)}</p>
              <p className="text-[10px] text-muted-foreground">{t("Puan ({count})", { count: reviews.length })}</p>
            </div>
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <CheckCircle size={18} className="text-primary" />
              <p className="mt-1 text-lg font-black text-foreground">{profile.total_completed || 0}</p>
              <p className="text-[10px] text-muted-foreground">{t("Tamamlanan")}</p>
            </div>
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <Award size={18} className="text-success" />
              <p className="mt-1 text-lg font-black text-foreground">{credentials.length}</p>
              <p className="text-[10px] text-muted-foreground">{t("Belge")}</p>
            </div>
          </div>

          {profile.bio && (
            <div className="mb-5 rounded-xl bg-card p-4 shadow-card">
              <p className="text-xs font-semibold text-muted-foreground">{t("Hakkında")}</p>
              <p className="mt-1 text-sm text-foreground">{profile.bio}</p>
            </div>
          )}

          {(profile.skills?.length ?? 0) > 0 && (
            <div className="mb-5 rounded-xl bg-card p-4 shadow-card">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">{t("Beceriler")}</p>
              <div className="flex flex-wrap gap-2">
                {(profile.skills || []).map((s) => (
                  <span key={s} className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-foreground">
                    {t(SKILL_LABELS[s] || s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {credentials.length > 0 && (
            <div className="mb-5 rounded-2xl bg-card p-4 shadow-card">
              <p className="mb-1 flex items-center gap-1.5 text-sm font-black text-foreground">
                <BadgeCheck size={16} className="text-primary" />
                {t("Yetkinlik Belgeleri")}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("Bu belgeler kullanıcı tarafından yüklenmiştir; doğruluğu Bi' El At tarafından onaylanmamıştır.")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {credentials.map((c) => (
                  <div key={c.id} className="overflow-hidden rounded-xl border border-border">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.title} className="h-24 w-full object-cover" />
                    ) : (
                      <div className="flex h-24 w-full items-center justify-center bg-muted">
                        <BadgeCheck size={24} className="text-muted-foreground" />
                      </div>
                    )}
                    <p className="px-2 py-2 text-xs font-bold text-foreground line-clamp-2">{c.title}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="mb-3 flex items-center gap-1.5 text-sm font-black text-foreground">
              <Star size={16} className="text-accent" />
              {t("Değerlendirmeler")}
            </p>
            {reviews.length === 0 ? (
              <div className="rounded-2xl bg-card p-4 shadow-card">
                <p className="text-xs text-muted-foreground">{t("Henüz değerlendirme yok.")}</p>
              </div>
            ) : (
              <div className="-mx-5 overflow-x-auto px-5 scrollbar-hide">
                <div className="flex gap-3 pb-2">
                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="flex min-w-[260px] max-w-[260px] flex-col justify-between rounded-2xl bg-card p-4 shadow-card"
                    >
                      <div>
                        <div className="mb-3 flex items-center gap-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-black text-primary">
                            {initials(r.reviewer?.full_name)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-foreground">
                              {initials(r.reviewer?.full_name)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{timeAgoIn(r.created_at, lang)}</p>
                          </div>
                        </div>
                        <div className="mb-2 flex items-center gap-0.5 text-accent">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={12}
                              fill={i < r.rating ? "currentColor" : "transparent"}
                              className={i < r.rating ? "text-accent" : "text-muted-foreground/40"}
                            />
                          ))}
                        </div>
                        {r.comment ? (
                          <p className="line-clamp-4 text-xs leading-relaxed text-foreground">{r.comment}</p>
                        ) : (
                          <p className="text-xs italic text-muted-foreground">{t("Yorum yapılmamış")}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
