import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

export const OFFER_CONFIRM_MINUTES = 15;

/** El atan kişinin son onayı için kalan süreyi gösterir. */
const OfferConfirmCountdown = ({ respondedAt }: { respondedAt?: string | null }) => {
  const t = useT();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!respondedAt) return null;
  const deadline = new Date(respondedAt).getTime() + OFFER_CONFIRM_MINUTES * 60 * 1000;
  const left = Math.max(0, deadline - now);
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);

  return (
    <p className="mt-2 text-center text-xs font-semibold text-amber-600">
      {t("Onaylaman için kalan süre: {time}", { time: `${mm}:${String(ss).padStart(2, "0")}` })}
      <span className="mt-0.5 block font-normal text-muted-foreground">
        {t("Süre dolarsa bu iş üzerindeki hakkın düşer.")}
      </span>
    </p>
  );
};

export default OfferConfirmCountdown;
