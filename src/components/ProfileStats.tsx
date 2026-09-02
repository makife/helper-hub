import { useEffect, useState } from "react";
import { Star, CheckCircle2, Wrench, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useT } from "@/lib/i18n";

type Props = { userId: string };

type Stats = {
  rating: number;
  totalCompleted: number;
  asOwnerCompleted: number;
  asTaskerCompleted: number;
  memberSince: string | null;
};

// Herhangi bir kullanıcının profilinde gösterilebilecek özet istatistik kartı.
// Hem kendi profilinde hem başkasının profilinde kullanılabilir (userId parametresiyle).
const ProfileStats = ({ userId }: Props) => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: ownedCompleted }, { data: myAssignmentRows }] = await Promise.all([
        supabase.from("profiles").select("rating, total_completed, created_at").eq("user_id", userId).maybeSingle(),
        supabase.from("tasks").select("id").eq("owner_id", userId).eq("status", "completed"),
        supabase.from("task_assignments").select("task_id").eq("tasker_id", userId).eq("status", "accepted"),
      ]);

      let asTaskerCompleted = 0;
      const taskIds = [...new Set((myAssignmentRows || []).map((r) => r.task_id))];
      if (taskIds.length > 0) {
        const { data: myCompletedTasks } = await supabase
          .from("tasks")
          .select("id")
          .in("id", taskIds)
          .eq("status", "completed");
        asTaskerCompleted = myCompletedTasks?.length || 0;
      }

      if (cancelled) return;
      setStats({
        rating: profile?.rating || 0,
        totalCompleted: profile?.total_completed || 0,
        asOwnerCompleted: ownedCompleted?.length || 0,
        asTaskerCompleted,
        memberSince: profile?.created_at || null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!stats) return null;

  const memberSinceLabel = stats.memberSince
    ? new Date(stats.memberSince).toLocaleDateString("tr-TR", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
          <Star size={14} className="text-accent" />
          <span className="text-[11px] font-bold">{t("Puan")}</span>
        </div>
        <p className="text-xl font-black text-foreground">{stats.rating.toFixed(1)}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
          <CheckCircle2 size={14} className="text-primary" />
          <span className="text-[11px] font-bold">{t("Toplam Tamamlanan")}</span>
        </div>
        <p className="text-xl font-black text-foreground">{stats.totalCompleted}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
          <Wrench size={14} className="text-primary" />
          <span className="text-[11px] font-bold">{t("El Atarak Tamamladığı")}</span>
        </div>
        <p className="text-xl font-black text-foreground">{stats.asTaskerCompleted}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-1 flex items-center gap-1.5 text-muted-foreground">
          <Calendar size={14} className="text-muted-foreground" />
          <span className="text-[11px] font-bold">{t("Üyelik")}</span>
        </div>
        <p className="text-sm font-black text-foreground">{memberSinceLabel || "—"}</p>
      </div>
    </div>
  );
};

export default ProfileStats;
