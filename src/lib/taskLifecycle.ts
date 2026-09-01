import { supabase } from "@/integrations/supabase/client";

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

export const isClosedStatus = (status: string) =>
  status === "completed" || status === "cancelled" || status === "expired" || status === "disputed";

/** İki koordinat arası mesafe (metre) */
export const distanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) => {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
};

export const ARRIVAL_RADIUS_M = 300;

/** Tasker'ın iş konumuna varışını doğrular ve kaydeder */
export const markArrival = async (
  taskId: string,
  taskLat: number,
  taskLng: number
): Promise<{ ok: boolean; distance?: number; message: string }> => {
  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  });

  if (!position) {
    return { ok: false, message: "Konumun alınamadı. Konum iznini açman gerekiyor." };
  }

  const distance = distanceMeters(
    position.coords.latitude,
    position.coords.longitude,
    taskLat,
    taskLng
  );

  if (distance > ARRIVAL_RADIUS_M) {
    return {
      ok: false,
      distance,
      message: `İş konumuna ${distance} m uzaktasın. Varış kaydı için ${ARRIVAL_RADIUS_M} m içine girmelisin.`,
    };
  }

  const { data, error } = await supabase.rpc("mark_arrival", {
    _task_id: taskId,
    _distance_m: distance,
  });

  if (error || data === false) {
    return { ok: false, distance, message: "Varış kaydedilemedi, tekrar dene." };
  }
  return { ok: true, distance, message: `Varışın kaydedildi (${distance} m).` };
};

export type CompletionResult = { ok: boolean; message: string; code?: string };

/** Tasker: "İşi bitirdim" — varış kanıtı ve minimum süre kontrollü */
export const requestCompletion = async (taskId: string): Promise<CompletionResult> => {
  const { data, error } = await supabase.rpc("request_task_completion", { _task_id: taskId });
  if (error) return { ok: false, message: "İstek gönderilemedi, tekrar dene." };

  switch (data) {
    case "ok":
      return { ok: true, message: "İş verene onay isteği gönderildi." };
    case "no_arrival":
      return {
        ok: false,
        code: "no_arrival",
        message: "Önce iş konumuna gidip varışını kaydetmelisin.",
      };
    case "too_soon":
      return {
        ok: false,
        code: "too_soon",
        message: "Varışından hemen sonra bitirdim diyemezsin. Biraz daha bekle.",
      };
    case "not_assigned":
      return { ok: false, code: "not_assigned", message: "Bu işin üzerinde değilsin." };
    default:
      return { ok: false, code: String(data), message: "İş şu an tamamlanabilir durumda değil." };
  }
};

/** İş veren: onaylar ve işi tamamlar (sunucu tarafında doğrulanır) */
export const confirmCompletion = async (taskId: string) => {
  const { data, error } = await supabase.rpc("confirm_task_completion", {
    _task_id: taskId,
  });
  return !error && data === true;
};

/** İş veren: yardım çağrısını iptal eder (sunucu tarafında doğrulanır) */
export const cancelTask = async (taskId: string) => {
  const { data, error } = await supabase.rpc("cancel_task", { _task_id: taskId });
  return !error && data === true;
};

/** İş veren: "İş yapılmadı" itirazı */
export const rejectCompletion = async (
  taskId: string,
  reason?: string
): Promise<CompletionResult> => {
  const { data, error } = await supabase.rpc("reject_task_completion", {
    _task_id: taskId,
    _reason: reason ?? null,
  });
  if (error) return { ok: false, message: "İtirazın kaydedilemedi, tekrar dene." };

  if (data === "rejected") {
    return {
      ok: true,
      code: "rejected",
      message: "İtirazın iletildi. El atan kişi işi tamamlayıp tekrar bildirebilir.",
    };
  }
  if (data === "disputed") {
    return {
      ok: true,
      code: "disputed",
      message: "İkinci itirazın anlaşmazlık olarak değerlendirildi ve tarafsız kurallarla sonuçlandırıldı.",
    };
  }
  return { ok: false, message: "İtiraz şu an yapılamıyor." };
};

/** Onay için kalan süre (24 saat) */
export const confirmDeadlineMs = (requestedAt?: string | null) => {
  if (!requestedAt) return 0;
  return new Date(requestedAt).getTime() + 24 * 60 * 60 * 1000 - Date.now();
};

/** "İşi bitirdim" için varıştan sonra beklenmesi gereken süre */
export const completionUnlockMs = (
  arrivedAt?: string | null,
  estimatedMinutes?: number | null
) => {
  if (!arrivedAt) return null;
  const wait = Math.max((estimatedMinutes ?? 30) * 0.3, 5) * 60 * 1000;
  return new Date(arrivedAt).getTime() + wait - Date.now();
};

export const formatRemaining = (ms: number) => {
  if (ms <= 0) return "0dk";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}sa ${m}dk` : `${m}dk`;
};
