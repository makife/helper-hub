import { Star } from "lucide-react";
import { useT } from "@/lib/i18n";

type Props = { score: number; size?: number; showLabel?: boolean };

/** Güven doğrulama yıldızları (0-5). */
const TrustStars = ({ score, size = 14, showLabel = true }: Props) => {
  const t = useT();
  const value = Math.max(0, Math.min(5, score));
  return (
    <span className="inline-flex items-center gap-1">
      <span className="inline-flex items-center gap-0.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            size={size}
            className={i < value ? "fill-primary text-primary" : "text-muted-foreground/40"}
          />
        ))}
      </span>
      {showLabel && (
        <span className="text-[11px] font-bold text-muted-foreground">
          {t("Güven")} {value}/5
        </span>
      )}
    </span>
  );
};

export default TrustStars;
