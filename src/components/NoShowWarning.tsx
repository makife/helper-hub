import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { formatRemaining } from "@/lib/taskLifecycle";

type Props = {
  scheduledAt: string | null | undefined;
  arrived: boolean;
};

/**
 * El atana randevu saati öncesinde ve sonrasında uyarı gösterir.
 * Randevu saatinden 1 saat sonra varış yoksa iş otomatik iptal olur
 * ve hesap 1 ay askıya alınır.
 */
const GRACE_MS = 60 * 60 * 1000;

const NoShowWarning = ({ scheduledAt, arrived }: Props) => {
  const t = useT();
  const [now, setNow] = useState(Date.now());
  const toasted = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const start = scheduledAt ? new Date(scheduledAt).getTime() : NaN;
  const valid = !arrived && !Number.isNaN(start);
  const untilStart = valid ? start - now : 0;
  const untilCancel = valid ? start + GRACE_MS - now : 0;
  const late = valid && untilStart <= 0;
  const soon = valid && untilStart > 0 && untilStart <= 60 * 60 * 1000;

  useEffect(() => {
    if (late && !toasted.current && untilCancel > 0) {
      toasted.current = true;
      toast.warning(t("Randevu saatin geçti"), {
        description: t("Varış kaydetmezsen iş iptal edilir ve hesabın 1 ay askıya alınır."),
        duration: 8000,
      });
    }
  }, [late, untilCancel, t]);

  if (!valid || (!late && !soon)) return null;

  return (
    <div
      className={`flex items-start gap-2 rounded-2xl border px-3 py-2.5 text-xs font-semibold ${
        late
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-amber-500/40 bg-amber-500/10 text-amber-700"
      }`}
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      <span>
        {late
          ? untilCancel > 0
            ? t("Randevu saatin geçti. {time} içinde varış kaydetmezsen iş iptal edilir ve hesabın 1 ay askıya alınır.", {
                time: formatRemaining(untilCancel),
              })
            : t("Randevu saatini kaçırdın. İş iptal ediliyor.")
          : t("Randevuna {time} kaldı. Zamanında gitmezsen hesabın 1 ay askıya alınır.", {
              time: formatRemaining(untilStart),
            })}
      </span>
    </div>
  );
};

export default NoShowWarning;
