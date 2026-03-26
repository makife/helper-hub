import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "Açık", color: "text-primary" },
  matched: { label: "Eşleşti", color: "text-accent" },
  in_progress: { label: "Devam Ediyor", color: "text-primary" },
  completed: { label: "Tamamlandı", color: "text-green-600" },
  cancelled: { label: "İptal", color: "text-destructive" },
};

const categoryEmoji: Record<string, string> = {
  ampul_takma: "💡",
  perde_asma: "🪟",
  mobilya_monte: "🪑",
  duvar_tamir: "🔨",
  kucuk_tamir: "🔧",
  tasima_yardimi: "📦",
};

const MyTasks = () => {
  const [tasks, setTasks] = useState<Tables<"tasks">[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchTasks = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .or(`owner_id.eq.${user.id},tasker_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      setTasks(data || []);
      setLoading(false);
    };
    fetchTasks();
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">İşlerim</h1>
      </div>

      <div className="flex-1 px-5 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <Clock size={32} className="text-muted-foreground" />
            </div>
            <p className="mt-3 text-lg font-bold text-foreground">Henüz iş yok</p>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              İş oluştur veya yakındaki işleri kabul et.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, i) => {
              const status = statusLabels[task.status] || statusLabels.open;
              return (
                <motion.div
                  key={task.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl">
                    {categoryEmoji[task.category] || "📋"}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-foreground">{task.title}</h3>
                    <p className={`text-xs font-semibold ${status.color}`}>{status.label}</p>
                  </div>
                  <p className="text-base font-black text-primary">{task.current_price || task.price} ₺</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTasks;
