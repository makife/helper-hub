import { supabase } from "@/integrations/supabase/client";
import { translate } from "@/lib/i18n";

export const taskStatusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "Açık", color: "text-primary" },
  matched: { label: "Eşleşti", color: "text-accent" },
  in_progress: { label: "Devam Ediyor", color: "text-primary" },
  pending_confirm: { label: "Onay Bekliyor", color: "text-amber-600" },
  completed: { label: "Tamamlandı", color: "text-green-600" },
  cancelled: { label: "İptal Edildi", color: "text-destructive" },
  expired: { label: "Süresi Doldu", color: "text-muted-foreground" },
  disputed: { label: "Anlaşmazlık", color: "text-destructive" },
};

export const getTaskStatusLabel = (status: string) => translate(taskStatusLabels[status]?.label || status);

export const isClosedStatus = (status: string) =>
  status === "completed" || status === "cancelled" || status === "expired" || status === "disputed";

/** Two coordinates' distance in meters. */
export const distanceMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

export const ARRIVAL_RADIUS_M = 300;

export const markArrival = async (taskId: string, taskLat: number, taskLng: number): Promise<{ ok: boolean; distance?: number; message: string }> => {
  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition((pos) => resolve(pos), () => resolve(null), { enableHighAccuracy: true, timeout: 12000 });
  });
  if (!position) return { ok: false, message: translate("Konumun alınamadı. Konum iznini açman gerekiyor.") };
  const distance = distanceMeters(position.coords.latitude, position.coords.longitude, taskLat, taskLng);
  // Mesafe doğrulaması sunucuda yapılır; buradaki değer yalnızca kullanıcıya bilgi içindir.
  const { data, error } = await supabase.rpc("mark_arrival", {
    _task_id: taskId,
    _lat: position.coords.latitude,
    _lng: position.coords.longitude,
  });
  if (error) return { ok: false, distance, message: translate("Varış kaydedilemedi, tekrar dene.") };
  if (data === false) return { ok: false, distance, message: translate("İş konumuna {distance} m uzaktasın. Varış kaydı için {radius} m içine girmelisin.", { distance, radius: ARRIVAL_RADIUS_M }) };
  return { ok: true, distance, message: translate("Varışın kaydedildi ({distance} m).", { distance }) };
};


export type CompletionResult = { ok: boolean; message: string; code?: string };

export const requestCompletion = async (taskId: string): Promise<CompletionResult> => {
  const { data, error } = await supabase.rpc("request_task_completion", { _task_id: taskId });
  if (error) return { ok: false, message: translate("İstek gönderilemedi, tekrar dene.") };
  switch (data) {
    case "ok": return { ok: true, message: translate("İş verene onay isteği gönderildi.") };
    case "no_arrival": return { ok: false, code: "no_arrival", message: translate("Önce iş konumuna gidip varışını kaydetmelisin.") };
    case "too_soon": return { ok: false, code: "too_soon", message: translate("Varışından hemen sonra bitirdim diyemezsin. Biraz daha bekle.") };
    case "not_assigned": return { ok: false, code: "not_assigned", message: translate("Bu işin üzerinde değilsin.") };
    default: return { ok: false, code: String(data), message: translate("İş şu an tamamlanabilir durumda değil.") };
  }
};

export const confirmCompletion = async (taskId: string) => {
  const { data, error } = await supabase.rpc("confirm_task_completion", { _task_id: taskId });
  return !error && data === true;
};
export const cancelTask = async (taskId: string) => {
  const { data, error } = await supabase.rpc("cancel_task", { _task_id: taskId });
  return !error && data === true;
};

export const rejectCompletion = async (taskId: string, reason?: string): Promise<CompletionResult> => {
  const { data, error } = await supabase.rpc("reject_task_completion", { _task_id: taskId, _reason: reason ?? null });
  if (error) return { ok: false, message: translate("İtirazın kaydedilemedi, tekrar dene.") };
  if (data === "rejected") return { ok: true, code: "rejected", message: translate("İtirazın iletildi. El atan kişi işi tamamlayıp tekrar bildirebilir.") };
  if (data === "disputed") return { ok: true, code: "disputed", message: translate("İkinci itirazın anlaşmazlık olarak değerlendirildi ve tarafsız kurallarla sonuçlandırıldı.") };
  return { ok: false, message: translate("İtiraz şu an yapılamıyor.") };
};

export const confirmDeadlineMs = (requestedAt?: string | null) => !requestedAt ? 0 : new Date(requestedAt).getTime() + 24 * 60 * 60 * 1000 - Date.now();
export const completionUnlockMs = (arrivedAt?: string | null, estimatedMinutes?: number | null) => {
  if (!arrivedAt) return null;
  const wait = Math.max((estimatedMinutes ?? 30) * 0.3, 5) * 60 * 1000;
  return new Date(arrivedAt).getTime() + wait - Date.now();
};
export const formatRemaining = (ms: number) => {
  if (ms <= 0) return translate("0dk");
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? translate("{h}sa {m}dk", { h, m }) : translate("{m}dk", { m });
};
