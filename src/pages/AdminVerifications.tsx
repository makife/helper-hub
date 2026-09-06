import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { formatDateTime } from "@/lib/dateFormat";
import { VERIFICATION_BUCKET, VerificationRequest, kindLabel, signedDocUrl } from "@/lib/trust";
import { toast } from "sonner";

const AdminVerifications = () => {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<VerificationRequest[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

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
        .select("user_id, full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      for (const p of profs ?? []) map[p.user_id] = p.full_name;
      setNames(map);
    }

    const urlMap: Record<string, string> = {};
    await Promise.all(
      list
        .filter((r) => r.file_path)
        .map(async (r) => {
          const url = await signedDocUrl(r.file_path as string);
          if (url) urlMap[r.id] = url;
        }),
    );
    setUrls(urlMap);
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

  const visible = rows.filter((r) => (filter === "pending" ? r.status === "pending" : true));

  if (isAdmin === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm font-bold text-muted-foreground">{t("Bu sayfaya erişimin yok.")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <button onClick={() => navigate(-1)} className="text-foreground">
          <ArrowLeft size={20} />
        </button>
        <p className="flex items-center gap-2 text-sm font-black text-foreground">
          <ShieldCheck size={16} className="text-primary" />
          {t("Güven Doğrulamaları")}
        </p>
      </header>

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
      ) : visible.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {t("Bekleyen başvuru yok.")}
        </p>
      ) : (
        <div className="space-y-3 px-4">
          {visible.map((row) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl bg-card p-4 shadow-card"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-foreground">
                    {names[row.user_id] || t("Kullanıcı")}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {t(kindLabel(row.kind))} · {formatDateTime(row.created_at)}
                  </p>
                </div>
                <span className="rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
                  {row.status === "pending"
                    ? t("İncelemede")
                    : row.status === "approved"
                      ? t("Onaylandı")
                      : t("Reddedildi")}
                </span>
              </div>

              {urls[row.id] && (
                <a href={urls[row.id]} target="_blank" rel="noreferrer">
                  <img
                    src={urls[row.id]}
                    alt={t(kindLabel(row.kind))}
                    className="mb-3 max-h-72 w-full rounded-xl object-contain"
                  />
                </a>
              )}

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
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminVerifications;
