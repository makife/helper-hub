import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { getLang, translate, useT } from "@/lib/i18n";
import { formatPrice, getTaskCurrency } from "@/lib/currency";
import { fetchTaskOffers, type OfferRow } from "@/lib/offers";

type Step = {
  label: string;
  at?: string | null;
  tone?: "default" | "danger" | "success";
  note?: string;
};

const fmt = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(getLang() === "en" ? "en-US" : "tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildOfferSteps = (
  task: Tables<"tasks">,
  offers: OfferRow[],
  names: Record<string, string>
): Step[] => {
  const cur = getTaskCurrency(task);
  const steps: Step[] = [];
  for (const o of offers) {
    const who = names[o.tasker_id] || translate("El atan");
    const amount = formatPrice(o.amount, cur);
    steps.push({
      label: translate("{name} {amount} fiyat teklifi verdi", { name: who, amount }),
      at: o.created_at,
      note: o.message || undefined,
    });
    if (o.status === "rejected") {
      steps.push({
        label: translate("İş veren {name} teklifini reddetti", { name: who }),
        at: o.responded_at,
        tone: "danger",
      });
    }
    if (o.status === "accepted" || o.status === "confirmed") {
      steps.push({
        label: translate("İş veren {name} teklifini kabul etti ({amount})", { name: who, amount }),
        at: o.responded_at,
        tone: "success",
      });
    }
    if (o.status === "confirmed") {
      steps.push({
        label: translate("{name} teklifi onayladı, işe atandı", { name: who }),
        at: o.updated_at,
        tone: "success",
      });
    }
  }
  return steps.sort(
    (a, b) => new Date(a.at ?? 0).getTime() - new Date(b.at ?? 0).getTime()
  );
};

export const buildTaskSteps = (
  task: Tables<"tasks">,
  arrivedAt?: string | null,
  offerSteps: Step[] = []
): Step[] => {
  const steps: Step[] = [
    { label: "Yardım çağrısı oluşturuldu", at: task.created_at },
    ...offerSteps,
  ];

  if (task.matched_at) {
    steps.push({ label: "El atan bulundu", at: task.matched_at });
  }


  if (arrivedAt) {
    steps.push({
      label: "El atan iş konumuna vardı",
      at: arrivedAt,
      tone: "success",
    });
  } else if (task.status === "matched" || task.status === "in_progress") {
    steps.push({ label: "El atan yola çıktı, varış bekleniyor" });
  }

  if (task.completion_requested_at) {
    steps.push({
      label: "El atan “işi bitirdim” dedi",
      at: task.completion_requested_at,
    });
  }

  if (task.rejection_count) {
    steps.push({
      label: translate("İş veren itiraz etti ({rejection_count}/2)", {
        rejection_count: task.rejection_count,
      }),
      at: task.last_rejected_at,
      tone: "danger",
      note:
        task.dispute_reason ||
        (task.rejection_count >= 2
          ? "İkinci itiraz anlaşmazlık başlattı."
          : "El atan işi tamamlayıp tekrar bildirebilir."),
    });
    if (task.status === "in_progress") {
      steps.push({ label: "El atan işe geri döndü, tekrar sürüyor" });
    }
  }

  if (task.status === "pending_confirm") {
    steps.push({ label: "El atan bitirdiğini belirtti, sizden onay bekliyor" });
  }

  if (task.disputed_at) {
    steps.push({
      label: "Anlaşmazlık sistem kurallarıyla çözüldü",
      at: task.disputed_at,
      tone: "danger",
    });
  }

  if (task.completed_at) {
    steps.push({ label: "İş tamamlandı", at: task.completed_at, tone: "success" });
  }
  if (task.status === "expired") {
    steps.push({
      label: "Süresi doldu, kredi iade edildi",
      at: task.cancelled_at,
      tone: "danger",
    });
  } else if (task.status === "cancelled") {
    steps.push({ label: "İptal edildi", at: task.cancelled_at, tone: "danger" });
  }

  return steps;
};

const toneClass = (tone?: Step["tone"]) =>
  tone === "danger"
    ? "bg-destructive"
    : tone === "success"
    ? "bg-green-500"
    : "bg-primary";

const TaskTimeline = ({
  task,
  arrivedAt,
  compact,
}: {
  task: Tables<"tasks">;
  arrivedAt?: string | null;
  compact?: boolean;
}) => {
  const t = useT();
  const [offerSteps, setOfferSteps] = useState<Step[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const offers = await fetchTaskOffers(task.id);
      if (!active || offers.length === 0) {
        if (active) setOfferSteps([]);
        return;
      }
      const ids = [...new Set(offers.map((o) => o.tasker_id))];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const names: Record<string, string> = {};
      (data ?? []).forEach((p: { user_id: string; full_name: string }) => {
        names[p.user_id] = p.full_name;
      });
      if (active) setOfferSteps(buildOfferSteps(task, offers, names));
    })();
    return () => {
      active = false;
    };
  }, [task.id, task.currency]);

  const steps = buildTaskSteps(task, arrivedAt, offerSteps);
  const shown = compact ? steps.slice(-3) : steps;


  return (
    <ol className="mt-3 space-y-2">
      {shown.map((s, i) => (
        <li key={`${t(s.label)}-${i}`} className="flex gap-2">
          <div className="flex flex-col items-center">
            <span className={`mt-1 h-2 w-2 rounded-full ${toneClass(s.tone)}`} />
            {i < shown.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className="pb-1">
            <p className="text-[11px] font-semibold text-foreground">{t(s.label)}</p>
            {s.at && (
              <p className="text-[10px] text-muted-foreground">{fmt(s.at)}</p>
            )}
            {s.note && (
              <p className="text-[10px] text-muted-foreground">{t(s.note)}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};

export default TaskTimeline;
