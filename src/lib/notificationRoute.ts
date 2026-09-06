/**
 * Bildirim türüne göre açılacak ekranı belirler.
 * Teklif bildirimleri, "Onayla ve Başla" butonunu içeren detay sayfasına (Home) gider.
 */
export const pathForNotification = (type: string | null | undefined, taskId?: string | null) => {
  const t = (type ?? "").toLowerCase();

  if (t === "message") return "/messages";
  if (t === "report") return "/admin/reports";
  if (t === "verification_request") return "/admin/verifications";
  if (t === "verification_approved" || t === "verification_rejected") return "/profile";
  if (
    t === "sanction_warning" ||
    t === "sanction_suspended" ||
    t === "sanction_lifted" ||
    t === "account_suspended" ||
    t === "no_show_suspended" ||
    t === "suspend" ||
    t === "unsuspend" ||
    t === "refund"
  ) {
    return "/profile";
  }

  // Teklif akışı: el atan kişinin onaylayabileceği detay sayfası
  if ((t === "offer_accepted" || t === "offer_rejected" || t === "rejected" || t === "accepted") && taskId) {
    return `/home?task=${taskId}`;
  }

  if (taskId) return `/my-tasks?task=${taskId}`;
  return "/notifications";
};
