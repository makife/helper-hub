import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { MapPin, Bell, Search, Plus, User, Zap, X, Star, Clock, ChevronRight } from "lucide-react";
import TaskMap from "@/components/TaskMap";
import { useAuth } from "@/contexts/AuthContext";

const demoTasks = [
  { id: "1", title: "Ampul Takma", price: 150, lat: 40.9920, lng: 29.0280, urgent: true, emoji: "💡", distance: "0.8 km", estimatedMinutes: 15 },
  { id: "2", title: "Perde Asma", price: 200, lat: 40.9880, lng: 29.0320, urgent: false, emoji: "🪟", distance: "1.2 km", estimatedMinutes: 30 },
  { id: "3", title: "Mobilya Monte", price: 350, lat: 40.9860, lng: 29.0250, urgent: false, emoji: "🪑", distance: "2.1 km", estimatedMinutes: 45 },
  { id: "4", title: "Duvar Tamiri", price: 280, lat: 40.9940, lng: 29.0350, urgent: false, emoji: "🔨", distance: "0.5 km", estimatedMinutes: 30 },
];

type TaskPin = typeof demoTasks[number];

const Home = () => {
  const [selectedTask, setSelectedTask] = useState<TaskPin | null>(null);
  const handleTaskClick = (task: { id: string; title: string; price: number; lat: number; lng: number; emoji: string; urgent?: boolean; distance?: string; estimatedMinutes?: number }) => {
    const matched = demoTasks.find(t => t.id === task.id);
    if (matched) setSelectedTask(matched);
  };
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pb-3 pt-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">📍 Kadıköy, İstanbul</p>
          <h1 className="text-xl font-black text-foreground">Merhaba! 👋</h1>
        </div>
        <div className="flex gap-2">
          <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
            <Search size={18} className="text-muted-foreground" />
          </button>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
            <Bell size={18} className="text-muted-foreground" />
            <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-destructive" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="relative mx-5 mb-4 overflow-hidden rounded-2xl border border-border shadow-card" style={{ height: 260 }}>
        <TaskMap tasks={demoTasks} onTaskClick={handleTaskClick} />
      </div>

      {/* Stats */}
      <div className="mx-5 mb-4 flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary/5 px-3 py-2.5">
          <Zap size={16} className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Bugün</p>
            <p className="text-sm font-black text-foreground">{demoTasks.length} iş var</p>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-accent/30 px-3 py-2.5">
          <MapPin size={16} className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Yakınında</p>
            <p className="text-sm font-black text-foreground">1 km içi</p>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-foreground">Yakındaki İşler</h2>
          <button className="text-xs font-bold text-primary">Tümünü Gör</button>
        </div>
        <div className="space-y-3 pb-24">
          {demoTasks.map((task, i) => (
            <motion.button
              key={task.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => setSelectedTask(task)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-card transition-all active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl">
                {task.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">{task.title}</h3>
                  {task.urgent && (
                    <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">🔥 ACİL</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{task.distance}</span>
                  <span>·</span>
                  <span>{task.estimatedMinutes} dk</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-primary">{task.price} ₺</p>
                <ChevronRight size={14} className="ml-auto text-muted-foreground" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Task Detail Sheet */}
      <AnimatePresence>
        {selectedTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTask(null)}
              className="fixed inset-0 z-40 bg-foreground/20"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl bg-card p-6 shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-2xl">
                    {selectedTask.emoji}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-foreground">{selectedTask.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin size={12} />
                      <span>{selectedTask.distance}</span>
                      <Clock size={12} />
                      <span>~{selectedTask.estimatedMinutes} dk</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedTask(null)} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  <X size={16} className="text-muted-foreground" />
                </button>
              </div>

              <div className="mb-4 rounded-xl bg-muted/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ücret</span>
                  <span className="text-2xl font-black text-primary">{selectedTask.price} ₺</span>
                </div>
                {selectedTask.urgent && (
                  <p className="mt-1 text-xs font-semibold text-destructive">🔥 Acil iş — hemen başlaman bekleniyor</p>
                )}
              </div>

              <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Star size={14} className="text-accent" />
                <span>İş Sahibi: <span className="font-bold text-foreground">4.8</span> (12 iş)</span>
              </div>

              <button className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]">
                Kabul Et ✋
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-card px-4 pb-2 pt-3 safe-bottom">
        <button className="flex flex-col items-center gap-0.5">
          <MapPin size={20} className="text-primary" />
          <span className="text-[10px] font-bold text-primary">Keşfet</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <Search size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">İşlerim</span>
        </button>
        <button
          onClick={() => navigate("/create-task")}
          className="gradient-warm -mt-5 flex h-14 w-14 items-center justify-center rounded-full shadow-soft"
        >
          <Plus size={24} className="text-primary-foreground" />
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <Bell size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">Bildirim</span>
        </button>
        <button onClick={signOut} className="flex flex-col items-center gap-0.5">
          <User size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">Profil</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
