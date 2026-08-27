import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Clock, MapPin, Star, User, Users, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useLivePrice, formatCountdown } from "@/lib/dynamicPricing";
import { acceptTask, leaveTask } from "@/lib/assignments";
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
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [iAccepted, setIAccepted] = useState(false);
  const livePrice = useLivePrice(task);
  const needed = task.person_count ?? 1;

  // Görüntüleme kaydı (iş veren hariç)
  useEffect(() => {
    if (!user || user.id === task.owner_id) return;
    supabase
      .from("task_views")
      .upsert(
        { task_id: task.id, viewer_id: user.id, viewed_at: new Date().toISOString() },
        { onConflict: "task_id,viewer_id" }
      )
      .then(() => {});
  }, [task.id, task.owner_id, user?.id]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", task.owner_id)
      .maybeSingle()
      .then(({ data }) => setOwner(data));
  }, [task.owner_id]);

  const loadAssignments = async () => {
    const { data } = await supabase
      .from("task_assignments")
      .select("tasker_id")
      .eq("task_id", task.id)
      .eq("status", "accepted");
    setAcceptedCount(data?.length ?? 0);
    setIAccepted(!!user && (data || []).some((a) => a.tasker_id === user.id));
  };

  useEffect(() => {
    loadAssignments();
    const channel = supabase
      .channel(`task-assignments-${task.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignments", filter: `task_id=eq.${task.id}` },
        () => loadAssignments()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, user?.id]);

  const handleAccept = async () => {
    if (!user) return;
    setAccepting(true);
    const price = livePrice ? livePrice.price : task.current_price ?? task.price;
    const result = await acceptTask(task.id, user.id, price);
    setAccepting(false);

    if (result.ok !== true) {
      toast.error(result.message);
      if (result.reason === "already") {
        onClose();
        navigate(`/task/${task.id}`);
      }
      return;
    }

    toast.success(
      needed > 1
        ? `İş kabul edildi! (${acceptedCount + 1}/${needed} kişi) 🎉`
        : "İş kabul edildi! 🎉"
    );
    onAccepted?.(task);
    onClose();
    navigate(`/task/${task.id}`);
  };

  const handleLeave = async () => {
    if (!user) return;
    setAccepting(true);
    const ok = await leaveTask(task.id, user.id);
    setAccepting(false);
    if (!ok) { toast.error("İşten ayrılamadın, tekrar dene."); return; }
    toast.success("İşten ayrıldın.");
    loadAssignments();
  };


  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[1000] bg-foreground/20"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed bottom-0 left-0 right-0 z-[1001] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card p-6 shadow-lg"
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
            <div className="text-right">
              {livePrice && livePrice.price < livePrice.basePrice && (
                <span className="mr-2 text-sm font-semibold text-muted-foreground line-through">
                  {livePrice.basePrice} ₺
                </span>
              )}
              <span className="text-2xl font-black text-primary">
                {livePrice ? livePrice.price : task.current_price || task.price} ₺
              </span>
            </div>
          </div>
          {livePrice?.isDropping && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
              <TrendingDown size={12} />
              Fiyat düşüyor — sonraki düşüşe {formatCountdown(livePrice.msToNextDrop)}
              <span className="text-muted-foreground">(alt sınır {livePrice.minPrice} ₺)</span>
            </p>
          )}
          {livePrice?.atFloor && (
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              En düşük ücrete ulaşıldı ({livePrice.minPrice} ₺)
            </p>
          )}
          {task.urgency === "urgent" && (
            <p className="mt-1 text-xs font-semibold text-destructive">🔥 Acil iş — hemen başlaman bekleniyor</p>
          )}
        </div>
        {/* Kişi kontenjanı */}
        <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={14} className="text-primary" />
            <span>Kişi kontenjanı</span>
          </div>
          <span className="text-sm font-black text-foreground">
            {acceptedCount}/{needed} dolu
          </span>
        </div>

        {task.address_note && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={14} className="text-primary" />
            <span>{task.address_note}</span>
          </div>
        )}

        {user?.id !== task.owner_id && (
          iAccepted ? (
            <div className="space-y-2">
              <button
                onClick={() => { onClose(); navigate(`/task/${task.id}`); }}
                className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]"
              >
                İşi Aç 💬
              </button>
              <button
                onClick={handleLeave}
                disabled={accepting}
                className="w-full rounded-2xl border border-border px-6 py-3 text-sm font-bold text-muted-foreground disabled:opacity-50"
              >
                İşten Ayrıl
              </button>
            </div>
          ) : acceptedCount >= needed ? (
            <div className="w-full rounded-2xl bg-muted px-6 py-4 text-center text-sm font-bold text-muted-foreground">
              Kontenjan doldu ({needed}/{needed})
            </div>
          ) : (
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              {accepting
                ? "Kabul ediliyor..."
                : needed > 1
                  ? `Kabul Et ✋ (${acceptedCount}/${needed})`
                  : "Kabul Et ✋"}
            </button>
          )
        )}

      </motion.div>
    </>
  );
};

export default TaskDetailSheet;
