import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldAlert, Check, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { formatDateTime } from "@/lib/dateFormat";
import { REPORT_REASONS } from "@/lib/blocks";
import { toast } from "sonner";

type Row = {
  id: string;
  reporter_id: string;
  reported_id: string;
  task_id: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

const AdminReports = () => {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

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
      const { data } = await supabase
        .from("user_reports")
        .select("*")
        .order("created_at", { ascending: false });
      const list = (data ?? []) as Row[];
      setRows(list);
      const ids = Array.from(new Set(list.flatMap((r) => [r.reporter_id, r.reported_id])));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        const map: Record<string, string> = {};
        for (const p of profs ?? []) map[p.user_id] = p.full_name;
        setNames(map);
      }
      setLoading(false);
    })();
  }, [user]);

  const setStatus = async (id: string, status: string) => {
    setBusy(id);
    const { error } = await supabase.from("user_reports").update({ status }).eq("id", id);
    setBusy(null);
    if (error) {
      toast.error(t("İşlem tamamlanamadı"));
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success(t("Şikayet güncellendi"));
  };

  const visible = filter === "open" ? rows.filter((r) => r.status === "pending") : rows;

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} className="rounded-lg p-1.5 active:scale-95">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-base font-bold text-foreground">{t("Şikayetler")}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : !isAdmin ? (
        <div className="px-6 py-20 text-center text-sm text-muted-foreground">
          {t("Bu sayfaya erişim yetkiniz yok.")}
        </div>
      ) : (
        <div className="px-4 py-4">
          <div className="mb-4 flex gap-2">
            {(["open", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground"
                }`}
              >
                {f === "open" ? t("Bekleyen") : t("Tümü")}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <div className="px-6 py-20 text-center text-sm text-muted-foreground">
              {t("Şikayet yok.")}
            </div>
          ) : (
            <div className="space-y-3">
              {visible.map((r) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                        <ShieldAlert size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{reasonLabel(r.reason)}</p>
                        <p className="text-[11px] text-muted-foreground">{formatDateTime(r.created_at)}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.status === "pending"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.status === "pending"
                        ? t("Bekliyor")
                        : r.status === "reviewed"
                          ? t("İncelendi")
                          : t("Kapatıldı")}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {names[r.reporter_id] || t("Kullanıcı")}
                    </span>{" "}
                    →{" "}
                    <span className="font-semibold text-foreground">
                      {names[r.reported_id] || t("Kullanıcı")}
                    </span>
                  </p>

                  {r.details && (
                    <p className="mt-2 rounded-xl bg-muted/40 p-2.5 text-xs leading-5 text-foreground">
                      {r.details}
                    </p>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => navigate(`/profile/${r.reported_id}`)}
                      className="flex-1 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground active:scale-[0.98]"
                    >
                      {t("Profili gör")}
                    </button>
                    {r.status === "pending" && (
                      <button
                        disabled={busy === r.id}
                        onClick={() => setStatus(r.id, "reviewed")}
                        className="flex-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground active:scale-[0.98] disabled:opacity-60"
                      >
                        {t("İncelendi")}
                      </button>
                    )}
                    {r.status !== "closed" && (
                      <button
                        disabled={busy === r.id}
                        onClick={() => setStatus(r.id, "closed")}
                        className="flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground active:scale-[0.98] disabled:opacity-60"
                      >
                        <Check size={14} />
                        {t("Kapat")}
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
