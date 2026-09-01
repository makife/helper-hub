import { forwardRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PendingReview } from "@/hooks/usePendingReviews";

type Props = {
  review: PendingReview | null;
  onDone: () => void;
};

/** Zorunlu değerlendirme penceresi — puan verilmeden kapanmaz */
const ReviewDialog = forwardRef<HTMLDivElement, Props>(({ review, onDone }, ref) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!review || !user || rating === 0) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      task_id: review.taskId,
      reviewer_id: user.id,
      reviewee_id: review.revieweeId,
      rating,
      comment: comment.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error("Değerlendirme kaydedilemedi, tekrar dene."); return; }
    toast.success("Değerlendirmen kaydedildi. Teşekkürler!");
    setRating(0);
    setComment("");
    onDone();
  };

  return (
    <AnimatePresence>
      {review && (
        <div ref={ref} className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-5">
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 16 }}
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6 shadow-xl"
          >
            <p className="text-xs font-bold uppercase tracking-wide text-primary">İş tamamlandı</p>
            <h2 className="mt-1 text-lg font-black text-foreground">{review.taskTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-bold text-foreground">{review.revieweeName}</span> için puanın nedir?
              Devam etmek için değerlendirmen gerekiyor.
            </p>

            <div className="mt-4 flex justify-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className="p-1 active:scale-90 transition-transform"
                  aria-label={`${n} yıldız`}
                >
                  <Star
                    size={34}
                    className={n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="Kısa bir yorum (isteğe bağlı)"
              className="mt-4 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />

            <button
              onClick={submit}
              disabled={rating === 0 || saving}
              className="gradient-warm mt-4 w-full rounded-2xl py-3.5 font-bold text-primary-foreground shadow-soft disabled:opacity-50 active:scale-[0.98]"
            >
              {saving ? "Kaydediliyor..." : "Değerlendirmeyi Gönder"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});

ReviewDialog.displayName = "ReviewDialog";

export default ReviewDialog;
