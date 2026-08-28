import { supabase } from "@/integrations/supabase/client";

export const taskStatusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "Açık", color: "text-primary" },
  matched: { label: "Eşleşti", color: "text-accent" },
  in_progress: { label: "Devam Ediyor", color: "text-primary" },
  pending_confirm: { label: "Onay Bekliyor", color: "text-amber-600" },
  completed: { label: "Tamamlandı", color: "text-green-600" },
  cancelled: { label: "İptal Edildi", color: "text-destructive" },
  expired: { label: "Süresi Doldu", color: "text-muted-foreground" },
};

export const isClosedStatus = (status: string) =>
  status === "completed" || status === "cancelled" || status === "expired";

/** Tasker: "İşi bitirdim" — iş verenin onayına gönderir */
export const requestCompletion = async (taskId: string, userId: string) => {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "pending_confirm",
      completion_requested_at: new Date().toISOString(),
      completion_requested_by: userId,
    } as never)
    .eq("id", taskId);
  return !error;
};

/** İş veren: onaylar ve işi tamamlar */
export const confirmCompletion = async (taskId: string) => {
  const { error } = await supabase
    .from("tasks")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
    } as never)
    .eq("id", taskId);
  return !error;
};

/** Onay için kalan süre (24 saat) */
export const confirmDeadlineMs = (requestedAt?: string | null) => {
  if (!requestedAt) return 0;
  return new Date(requestedAt).getTime() + 24 * 60 * 60 * 1000 - Date.now();
};

export const formatRemaining = (ms: number) => {
  if (ms <= 0) return "0dk";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}sa ${m}dk` : `${m}dk`;
};
