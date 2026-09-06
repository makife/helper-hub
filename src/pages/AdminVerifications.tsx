import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Check, X, Loader2, ChevronRight, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { formatDateTime } from "@/lib/dateFormat";
import { VERIFICATION_BUCKET, VerificationRequest, kindLabel, signedDocUrl } from "@/lib/trust";
import { toast } from "sonner";

type Profile = { user_id: string; full_name: string; avatar_url: string | null };

const statusLabel = (s: VerificationRequest["status"]) =>
  s === "pending" ? "İncelemede" : s === "approved" ? "Onaylandı" : "Reddedildi";

const AdminVerifications = () => {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<VerificationRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [openUser, setOpenUser] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data ?? []) as VerificationRequest[];
    setRows(list);

    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", ids);
      const map: Record<string, Profile> = {};
      for (const p of profs ?? []) map[p.user_id] = p as Profile;
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");
      const admin = !!roles?.length;
      setIsAdmin(admin);
      if (!admin) {
        setLoading(false);
        return;
      }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Sadece açılan kişinin belgeleri için imzalı bağlantı üret
  useEffect(() => {
    if (!openUser) return;
    (async () => {
      const mine = rows.filter((r) => r.user_id === openUser && r.file_path && !urls[r.id]);
      if (!mine.length) return;
      const next: Record<string, string> = {};
      await Promise.all(
        mine.map(async (r) => {
          const url = await signedDocUrl(r.file_path as string);
          if (url) next[r.id] = url;
        }),
      );
      setUrls((prev) => ({ ...prev, ...next }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openUser, rows]);

  const groups = useMemo(() => {
    const byUser = new Map<string, VerificationRequest[]>();
    for (const r of rows) {
      if (filter === "pending" && r.status !== "pending") continue;
      const arr = byUser.get(r.user_id) ?? [];
      arr.push(r);
      byUser.set(r.user_id, arr);
    }
    return Array.from(byUser.entries())
      .map(([userId, items]) => ({
        userId,
        items,
        pending: items.filter((i) => i.status === "pending").length,
        latest: items.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at,
      }))
      .sort((a, b) => (b.pending - a.pending) || (a.latest < b.latest ? 1 : -1));
  }, [rows, filter]);

  const review = async (row: VerificationRequest, approve: boolean) => {
    let note: string | null = null;
    if (!approve) {
      note = window.prompt(t("Red sebebi (kullanıcı görecek)")) || null;
      if (note === null) return;
    }
    setBusy(row.id);
    const { error } = await supabase
      .from("verification_requests")
      .update({
        status: approve ? "approved" : "rejected",
        review_note: approve ? null : note,
      })
      .eq("id", row.id);

    if (!error && row.file_path) {
      // KVKK: inceleme bitince belge silinir
      await supabase.storage.from(VERIFICATION_BUCKET).remove([row.file_path]);
      await supabase.from("verification_requests").update({ file_path: null }).eq("id", row.id);
    }
    setBusy(null);
    if (error) {
      toast.error(t("İşlem tamamlanamadı"));
      return;
    }
    toast.success(approve ? t("Doğrulama onaylandı") : t("Doğrulama reddedildi"));
    setRows((prev) =>
      prev.map((r) =>
        r.id === row.id
          ? { ...r, status: approve ? "approved" : "rejected", review_note: approve ? null : note, file_path: null }
          : r,
      ),
    );
  };

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm font-bold text-muted-foreground">{t("Bu sayfaya erişimin yok.")}</p>
      </div>
    );
  }

  const detail = openUser ? rows.filter((r) => r.user_id === openUser) : [];
  const detailProfile = openUser ? profiles[openUser] : undefined;

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => (openUser ? setOpenUser(null) : navigate(-1))} className="text-foreground">
          <ArrowLeft size={20} />
        </button>
        <p className="flex items-center gap-2 text-sm font-black text-foreground">
          <ShieldCheck size={16} className="text-primary" />
          {openUser ? detailProfile?.full_name || t("Kullanıcı") : t("Güven Doğrulamaları")}
        </p>
      </header>

      {openUser ? (
        <div className="space-y-3 px-4 py-4">
          {detail.map((row) => (
            <div key={row.id} className="rounded-2xl bg-card p-4 shadow-card">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-foreground">{t(kindLabel(row.kind))}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(row.created_at)}</p>
                </div>
                <span
                  className={`rounded-lg px-2 py-1 text-[10px] font-bold ${
                    row.status === "pending"
                      ? "bg-primary/10 text-primary"
                      : row.status === "approved"
                        ? "bg-muted text-foreground"
                        : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {t(statusLabel(row.status))}
                </span>
              </div>

              {urls[row.id] ? (
                <a href={urls[row.id]} target="_blank" rel="noreferrer">
                  <img
                    src={urls[row.id]}
                    alt={t(kindLabel(row.kind))}
                    className="mb-3 max-h-72 w-full rounded-xl object-contain"
                  />
                </a>
              ) : row.file_path ? (
                <div className="mb-3 flex h-24 items-center justify-center rounded-xl bg-muted">
                  <Loader2 size={16} className="animate-spin text-muted-foreground" />
                </div>
              ) : null}

              {row.status === "rejected" && row.review_note && (
                <p className="mb-2 text-[11px] text-destructive">{row.review_note}</p>
              )}

              {row.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => review(row, true)}
                    disabled={busy === row.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <Check size={14} /> {t("Onayla")}
                  </button>
                  <button
                    onClick={() => review(row, false)}
                    disabled={busy === row.id}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted py-2.5 text-xs font-bold text-foreground disabled:opacity-50"
                  >
                    <X size={14} /> {t("Reddet")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="flex gap-2 px-4 py-3">
            {(["pending", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {f === "pending" ? t("Bekleyenler") : t("Tümü")}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : groups.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              {t("Bekleyen başvuru yok.")}
            </p>
          ) : (
            <div className="space-y-3 px-4">
              {groups.map((g, i) => {
                const p = profiles[g.userId];
                return (
                  <motion.button
                    key={g.userId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.02 }}
                    onClick={() => setOpenUser(g.userId)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left shadow-card"
                  >
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt={p.full_name} className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
                        <UserIcon size={18} className="text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-foreground">
                        {p?.full_name || t("Kullanıcı")}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {g.items.map((it) => t(kindLabel(it.kind))).join(" · ")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDateTime(g.latest)}</p>
                    </div>
                    {g.pending > 0 && (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-black text-primary-foreground">
                        {g.pending}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </motion.button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminVerifications;
