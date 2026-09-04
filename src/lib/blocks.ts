import { supabase } from "@/integrations/supabase/client";

/** Oturum sahibinin engellediği kullanıcı id'leri */
export const fetchBlockedIds = async (userId?: string | null): Promise<string[]> => {
  if (!userId) return [];
  const { data } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", userId);
  return (data || []).map((r) => r.blocked_id);
};

export const isBlocked = async (userId: string, otherId: string): Promise<boolean> => {
  const { data } = await supabase
    .from("user_blocks")
    .select("id")
    .eq("blocker_id", userId)
    .eq("blocked_id", otherId)
    .maybeSingle();
  return !!data;
};

export const blockUser = async (userId: string, otherId: string) => {
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: userId, blocked_id: otherId });
  return error;
};

export const unblockUser = async (userId: string, otherId: string) => {
  const { error } = await supabase
    .from("user_blocks")
    .delete()
    .eq("blocker_id", userId)
    .eq("blocked_id", otherId);
  return error;
};

export const REPORT_REASONS = [
  { id: "harassment", label: "Taciz veya hakaret" },
  { id: "scam", label: "Dolandırıcılık / sahte ilan" },
  { id: "no_show", label: "Gelmedi veya işi yapmadı" },
  { id: "unsafe", label: "Güvenliğimi tehdit etti" },
  { id: "spam", label: "Spam veya reklam" },
  { id: "other", label: "Diğer" },
] as const;

export const reportUser = async (params: {
  reporterId: string;
  reportedId: string;
  reason: string;
  details?: string;
  taskId?: string | null;
}) => {
  const { error } = await supabase.from("user_reports").insert({
    reporter_id: params.reporterId,
    reported_id: params.reportedId,
    reason: params.reason,
    details: params.details || null,
    task_id: params.taskId || null,
  });
  return error;
};
