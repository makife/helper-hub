import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Clock, CheckCircle, XCircle, Lightbulb, 
  Blinds, Armchair, Hammer, Wrench, Package, HelpCircle, 
  Trash2, Eye, Edit3, X 
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

const statusLabels: Record<string, { label: string; color: string }> = {
  open: { label: "Açık", color: "text-primary" },
  matched: { label: "Eşleşti", color: "text-accent" },
  in_progress: { label: "Devam Ediyor", color: "text-primary" },
  completed: { label: "Tamamlandı", color: "text-green-600" },
  cancelled: { label: "İptal Edildi", color: "text-destructive" },
};

// Lucide İkon Mapping
const categoryIcons: Record<string, JSX.Element> = {
  ampul_takma: <Lightbulb className="text-amber-500" size={24} />,
  perde_asma: <Blinds className="text-blue-500" size={24} />,
  mobilya_monte: <Armchair className="text-amber-700" size={24} />,
  duvar_tamir: <Hammer className="text-stone-500" size={24} />,
  kucuk_tamir: <Wrench className="text-slate-600" size={24} />,
  tasima_yardimi: <Package className="text-orange-500" size={24} />,
};

const MyTasks = () => {
  const [tasks, setTasks] = useState<Tables<"tasks">[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Tables<"tasks"> | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchTasks = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .or(`owner_id.eq.${user.id},tasker_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

  // Görev İptal Etme
  const handleCancelTask = async (taskId: string) => {
    if (!confirm("Bu yardım çağrısını iptal etmek istediğinize emin misiniz?")) return;
    
    setIsUpdating(true);
    const { error } = await supabase
      .from("tasks")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", taskId);

    if (!error) {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: "cancelled" } : t)));
      setSelectedTask(null);
    }
    setIsUpdating(false);
  };

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
            <p className="mt-1 text-center text-sm text-muted-foreground">İş oluştur veya yakındaki işleri kabul et.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task, i) => {
              const status = statusLabels[task.status] || statusLabels.open;
              const icon = categoryIcons[task.category] || <HelpCircle className="text-primary" size={24} />;

              return (
                <motion.div
                  key={task.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedTask(task)}
                  className="flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card hover:bg-muted/50 transition-colors"
                >
                  {/* Dinamik İkon Kutusu */}
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                    {icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="truncate text-sm font-bold text-foreground">{task.title}</h3>
                    <p className={`text-xs font-semibold ${status.color}`}>{status.label}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-base font-black text-primary">{task.current_price || task.price} ₺</p>
                    <span className="text-[10px] text-muted-foreground">Detay →</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detay & İşlem Modalı */}
      <AnimatePresence>
        {selectedTask && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-xl border border-border space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  {categoryIcons[selectedTask.category] || <HelpCircle size={20} />}
                  <h2 className="text-lg font-bold text-foreground">{selectedTask.title}</h2>
                </div>
                <button onClick={() => setSelectedTask(null)} className="rounded-full p-1 bg-muted hover:bg-muted/80">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-2 text-sm text-foreground">
                <div>
                  <span className="font-semibold text-muted-foreground">Açıklama:</span>
                  <p className="mt-1 text-sm bg-muted/40 p-3 rounded-xl">{selectedTask.description}</p>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Fiyat:</span>
                  <span className="font-bold text-primary">{selectedTask.price} ₺</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-muted-foreground">Durum:</span>
                  <span className={`font-bold ${statusLabels[selectedTask.status]?.color}`}>
                    {statusLabels[selectedTask.status]?.label}
                  </span>
                </div>
                {selectedTask.address_note && (
                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground">Adres Notu:</span>
                    <span className="font-medium">{selectedTask.address_note}</span>
                  </div>
                )}
              </div>

              {/* İşlem Butonları */}
              <div className="flex gap-2 pt-3">
                {selectedTask.status === "open" && selectedTask.owner_id === user?.id && (
                  <>
                    <button
                      disabled={isUpdating}
                      onClick={() => handleCancelTask(selectedTask.id)}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-destructive/10 text-destructive py-3 font-bold hover:bg-destructive/20"
                    >
                      <Trash2 size={18} />
                      İptal Et
                    </button>
                    
                    <button
                      onClick={() => {
                        setSelectedTask(null);
                        navigate(`/create-task?edit=${selectedTask.id}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-bold hover:opacity-90"
                    >
                      <Edit3 size={18} />
                      Düzenle
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyTasks;
