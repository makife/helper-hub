import { useEffect, useState } from "react";
import { Rocket, Flame, Trophy, Star, ShieldCheck, Wrench, CalendarCheck, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = { userId: string };

type BadgeData = {
  rating: number;
  totalCompleted: number;
  asOwnerCompleted: number;
  asTaskerCompleted: number;
  cancelCount: number;
  toolsCount: number;
  memberSinceDays: number;
};

type BadgeDef = {
  id: string;
  icon: typeof Rocket;
  label: string;
  description: string;
  isUnlocked: (d: BadgeData) => boolean;
  progress: (d: BadgeData) => { current: number; target: number };
};

// Rozet tanımları — tamamen mevcut veriden (profiles + tasks) hesaplanıyor,
// ekstra bir tablo/yazma işlemi gerektirmiyor. Yeni bir kural eklemek
// istersen bu diziye bir obje eklemen yeterli.
const BADGES: BadgeDef[] = [
  {
    id: "first_job",
    icon: Rocket,
    label: "İlk Adım",
    description: "İlk işini tamamla",
    isUnlocked: (d) => d.totalCompleted >= 1,
    progress: (d) => ({ current: Math.min(d.totalCompleted, 1), target: 1 }),
  },
  {
    id: "hardworking",
    icon: Flame,
    label: "Çalışkan",
    description: "El atarak 10 iş tamamla",
    isUnlocked: (d) => d.asTaskerCompleted >= 10,
    progress: (d) => ({ current: Math.min(d.asTaskerCompleted, 10), target: 10 }),
  },
  {
    id: "master_helper",
    icon: Trophy,
    label: "Usta Yardımcı",
    description: "El atarak 50 iş tamamla",
    isUnlocked: (d) => d.asTaskerCompleted >= 50,
    progress: (d) => ({ current: Math.min(d.asTaskerCompleted, 50), target: 50 }),
  },
  {
    id: "five_star",
    icon: Star,
    label: "5 Yıldız Ustası",
    description: "En az 5 işte 4.8+ puan ortalaması",
    isUnlocked: (d) => d.rating >= 4.8 && d.totalCompleted >= 5,
    progress: (d) => ({ current: Math.min(d.totalCompleted, 5), target: 5 }),
  },
  {
    id: "reliable_owner",
    icon: ShieldCheck,
    label: "Güvenilir İşveren",
    description: "5 iş aç, hiç iptal etme",
    isUnlocked: (d) => d.asOwnerCompleted >= 5 && d.cancelCount === 0,
    progress: (d) => ({ current: Math.min(d.asOwnerCompleted, 5), target: 5 }),
  },
  {
    id: "tool_ready",
    icon: Wrench,
    label: "Alet Çantası Dolu",
    description: "Profiline 15+ alet ekle",
    isUnlocked: (d) => d.toolsCount >= 15,
    progress: (d) => ({ current: Math.min(d.toolsCount, 15), target: 15 }),
  },
  {
    id: "veteran",
    icon: CalendarCheck,
    label: "Kıdemli Üye",
    description: "6 aydır Bi' El At'ta",
    isUnlocked: (d) => d.memberSinceDays >= 180,
    progress: (d) => ({ current: Math.min(d.memberSinceDays, 180), target: 180 }),
  },
];

const ProfileBadges = ({ userId }: Props) => {
  const [data, setData] = useState<BadgeData | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: profile }, { data: ownedCompleted }, { data: myAssignmentRows }] = await Promise.all([
        supabase
          .from("profiles")
          .select("rating, total_completed, cancel_count, owned_tools, custom_owned_tools, created_at")
          .eq("user_id", userId)
          .maybeSingle(),
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

      const memberSinceDays = profile?.created_at
        ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      setData({
        rating: profile?.rating || 0,
        totalCompleted: profile?.total_completed || 0,
        asOwnerCompleted: ownedCompleted?.length || 0,
        asTaskerCompleted,
        cancelCount: profile?.cancel_count || 0,
        toolsCount: (profile?.owned_tools?.length || 0) + (profile?.custom_owned_tools?.length || 0),
        memberSinceDays,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!data) return null;

  const unlockedCount = BADGES.filter((b) => b.isUnlocked(data)).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="mb-3 text-sm font-bold text-foreground">
        Rozetler <span className="text-muted-foreground">({unlockedCount}/{BADGES.length})</span>
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {BADGES.map((badge) => {
          const unlocked = badge.isUnlocked(data);
          const { current, target } = badge.progress(data);
          const Icon = badge.icon;
          return (
            <div
              key={badge.id}
              className={`rounded-xl border p-3 ${
                unlocked ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
              }`}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    unlocked ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {unlocked ? <Icon size={16} /> : <Lock size={13} />}
                </span>
              </div>
              <p className={`text-xs font-bold ${unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                {badge.label}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{badge.description}</p>
              {!unlocked && (
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/50"
                    style={{ width: `${Math.min(100, (current / target) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProfileBadges;
