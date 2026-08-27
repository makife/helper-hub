import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Clock, MapPin, Star, User, Navigation } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type TaskWithUI = Tables<"tasks"> & {
  emoji: string;
  lat: number;
  lng: number;
};

type Props = {
  task: TaskWithUI;
  onClose: () => void;
  onAccepted?: (task: TaskWithUI) => void;
};

const TaskDetailSheet = ({ task, onClose, onAccepted }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [owner, setOwner] = useState<Tables<"profiles"> | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", task.owner_id)
      .maybeSingle()
      .then(({ data }) => setOwner(data));
  }, [task.owner_id]);

  const handleAccept = async () => {
    if (!user) return;
    setAccepting(true);
    const { error } = await supabase
      .from("tasks")
      .update({
        tasker_id: user.id,
        status: "matched" as const,
        matched_at: new Date().toISOString(),
      })
      .eq("id", task.id)
      .eq("status", "open");

    setAccepting(false);
    if (error) {
      toast.error("İş kabul edilemedi. Başkası almış olabilir.");
      return;
    }
    toast.success("İş kabul edildi! 🎉");
    onClose();
    navigate(`/task/${task.id}`);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-foreground/20"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-2xl">
              {task.emoji}
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">{task.title}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>~{task.estimated_minutes} dk</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">{task.description}</p>

        {/* Owner Profile */}
        {owner && (
          <button
            onClick={() => { onClose(); navigate(`/profile/${owner.user_id}`); }}
            className="mb-4 flex w-full items-center gap-3 rounded-xl bg-muted/50 p-3 text-left transition-all active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              {owner.avatar_url ? (
                <img src={owner.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={18} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{owner.full_name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Star size={10} className="text-accent" />
                <span>{owner.rating || "0.0"}</span>
                <span>·</span>
                <span>{owner.total_completed || 0} iş</span>
              </div>
            </div>
            <span className="text-xs text-primary font-semibold">Profili Gör →</span>
          </button>
        )}

        <div className="mb-4 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ücret</span>
            <span className="text-2xl font-black text-primary">{task.current_price || task.price} ₺</span>
          </div>
          {task.urgency === "urgent" && (
            <p className="mt-1 text-xs font-semibold text-destructive">🔥 Acil iş — hemen başlaman bekleniyor</p>
          )}
        </div>

        {task.address_note && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={14} className="text-primary" />
            <span>{task.address_note}</span>
          </div>
        )}

        {user?.id !== task.owner_id && (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98] disabled:opacity-50"
          >
            {accepting ? "Kabul ediliyor..." : "Kabul Et ✋"}
          </button>
        )}
      </motion.div>
    </>
  );
};

export default TaskDetailSheet;
