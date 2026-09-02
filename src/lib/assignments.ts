import { translate } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export type AssignmentRow = {
  id: string;
  task_id: string;
  tasker_id: string;
  agreed_price: number | null;
  status: string;
  created_at: string;
};

/** Kabul edilen tasker sayısını task_id -> count şeklinde döndürür */
export const fetchAssignmentCounts = async (taskIds: string[]) => {
  const counts: Record<string, number> = {};
  if (taskIds.length === 0) return counts;
  const { data } = await supabase
    .from("task_assignments")
    .select("task_id, tasker_id, status")
    .in("task_id", taskIds)
    .eq("status", "accepted");
  (data || []).forEach((row) => {
    counts[row.task_id] = (counts[row.task_id] || 0) + 1;
  });
  return counts;
};

/** Bu kullanıcının aktif (devam eden) işini döndürür */
export const fetchMyActiveAssignment = async (userId: string) => {
  const { data } = await supabase
    .from("task_assignments")
    .select("*, tasks!inner(id, status, title)")
    .eq("tasker_id", userId)
    .eq("status", "accepted")
    .in("tasks.status", ["open", "matched", "in_progress"])
    .maybeSingle();
  return data as (AssignmentRow & { tasks: { id: string; status: string; title: string } }) | null;
};

export type AcceptResult =
  | { ok: true }
  | { ok: false; reason: "already" | "busy" | "full" | "credits" | "error"; message: string };

export const acceptTask = async (
  taskId: string,
  taskerId: string,
  agreedPrice: number
): Promise<AcceptResult> => {
  const { error } = await supabase.from("task_assignments").insert({
    task_id: taskId,
    tasker_id: taskerId,
    agreed_price: agreedPrice,
    status: "accepted",
  });

  if (!error) return { ok: true };

  const msg = `${error.message} ${error.details ?? ""}`;
  if (msg.includes("Yetersiz kredi")) {
    return { ok: false, reason: "credits", message: translate("Kredin yetersiz. Kredi Marketi'nden kredi yükleyebilirsin.") };
  }
  if (msg.includes("aktif bir isin var")) {
    return { ok: false, reason: "busy", message: translate("Zaten aktif bir işin var. Önce onu tamamla veya bırak.") };
  }
  if (error.code === "23505") {
    return { ok: false, reason: "already", message: translate("Bu işi zaten kabul ettin.") };
  }
  return { ok: false, reason: "error", message: translate("İş kabul edilemedi. Kontenjan dolmuş olabilir.") };
};

export const leaveTask = async (taskId: string, taskerId: string) => {
  const { error } = await supabase
    .from("task_assignments")
    .delete()
    .eq("task_id", taskId)
    .eq("tasker_id", taskerId);
  return !error;
};
