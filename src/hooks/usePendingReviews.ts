import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PendingReview = {
  taskId: string;
  taskTitle: string;
  revieweeId: string;
  revieweeName: string;
  role: "owner" | "tasker";
};

/**
 * Tamamlanan işlerde kullanıcının henüz puanlamadığı karşı tarafları döndürür.
 * Puanlama zorunlu olduğu için uygulama bunları modal ile gösterir.
 */
export const usePendingReviews = () => {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingReview[]>([]);

  const refresh = useCallback(async () => {
    if (!user) { setPending([]); return; }

    // Kullanıcının sahibi olduğu tamamlanmış işler
    const { data: ownedTasks } = await supabase
      .from("tasks")
      .select("id, title, owner_id, status")
      .eq("owner_id", user.id)
      .eq("status", "completed");

    // Kullanıcının üstlendiği işler
    const { data: myAssignments } = await supabase
      .from("task_assignments")
      .select("task_id, tasks(id, title, owner_id, status)")
      .eq("tasker_id", user.id)
      .eq("status", "accepted");

    const acceptedCompleted = (myAssignments || [])
      .map((r: any) => r.tasks)
      .filter((t: any) => t && t.status === "completed");

    const taskIds = [
      ...(ownedTasks || []).map((t) => t.id),
      ...acceptedCompleted.map((t: any) => t.id),
    ];
    if (taskIds.length === 0) { setPending([]); return; }

    const [{ data: assignments }, { data: myReviews }] = await Promise.all([
      supabase.from("task_assignments").select("task_id, tasker_id").in("task_id", taskIds).eq("status", "accepted"),
      supabase.from("reviews").select("task_id, reviewee_id").eq("reviewer_id", user.id).in("task_id", taskIds),
    ]);

    const done = new Set((myReviews || []).map((r) => `${r.task_id}:${r.reviewee_id}`));

    const targets: { taskId: string; taskTitle: string; revieweeId: string; role: "owner" | "tasker" }[] = [];

    (ownedTasks || []).forEach((t) => {
      (assignments || [])
        .filter((a) => a.task_id === t.id)
        .forEach((a) => targets.push({ taskId: t.id, taskTitle: t.title, revieweeId: a.tasker_id, role: "owner" }));
    });

    acceptedCompleted.forEach((t: any) => {
      targets.push({ taskId: t.id, taskTitle: t.title, revieweeId: t.owner_id, role: "tasker" });
    });

    const remaining = targets.filter(
      (t) => t.revieweeId !== user.id && !done.has(`${t.taskId}:${t.revieweeId}`)
    );
    if (remaining.length === 0) { setPending([]); return; }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", [...new Set(remaining.map((r) => r.revieweeId))]);

    setPending(
      remaining.map((r) => ({
        ...r,
        revieweeName:
          (profiles || []).find((p) => p.user_id === r.revieweeId)?.full_name ||
          (r.role === "owner" ? "Yardım eden" : "İş veren"),
      }))
    );
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  return { pending, refresh };
};
