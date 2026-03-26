import { motion } from "framer-motion";
import { MapPin, Bell, Search, Plus, User, Zap } from "lucide-react";

const demoTasks = [
  { id: 1, title: "Ampul Takma", price: 150, distance: "0.8 km", urgent: true, emoji: "💡" },
  { id: 2, title: "Perde Asma", price: 200, distance: "1.2 km", urgent: false, emoji: "🪟" },
  { id: 3, title: "Mobilya Monte", price: 350, distance: "2.1 km", urgent: false, emoji: "🪑" },
];

const Home = () => {
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

      {/* Map placeholder */}
      <div className="relative mx-5 mb-4 overflow-hidden rounded-2xl border border-border bg-muted shadow-card" style={{ height: 220 }}>
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <MapPin size={32} className="mx-auto mb-2 text-primary animate-pulse-soft" />
            <p className="text-sm font-bold text-foreground">Canlı Harita</p>
            <p className="text-xs text-muted-foreground">Leaflet entegrasyonu yakında</p>
          </div>
        </div>
        {/* Demo pins */}
        <div className="absolute left-[30%] top-[25%] flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground shadow-soft">💡</div>
        <div className="absolute left-[55%] top-[40%] flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs text-secondary-foreground shadow-card">🪟</div>
        <div className="absolute left-[70%] top-[60%] flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground shadow-soft">🪑</div>
      </div>

      {/* Stats */}
      <div className="mx-5 mb-4 flex gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-xl bg-primary/5 px-3 py-2.5">
          <Zap size={16} className="text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Bugün</p>
            <p className="text-sm font-black text-foreground">3 iş var</p>
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

      {/* Tasks */}
      <div className="flex-1 px-5">
        <h2 className="mb-3 text-base font-black text-foreground">Yakındaki İşler</h2>
        <div className="space-y-3">
          {demoTasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-card transition-all active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-xl">
                {task.emoji}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-foreground">{task.title}</h3>
                  {task.urgent && (
                    <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                      🔥 ACİL
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{task.distance} uzaklıkta</p>
              </div>
              <div className="text-right">
                <p className="text-base font-black text-primary">{task.price} ₺</p>
                <p className="text-[10px] text-muted-foreground">~30 dk</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="mt-4 flex items-center justify-around border-t border-border bg-card px-4 pb-2 pt-3">
        <button className="flex flex-col items-center gap-0.5">
          <MapPin size={20} className="text-primary" />
          <span className="text-[10px] font-bold text-primary">Keşfet</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <Search size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">İşlerim</span>
        </button>
        <button className="gradient-warm -mt-5 flex h-14 w-14 items-center justify-center rounded-full shadow-soft">
          <Plus size={24} className="text-primary-foreground" />
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <Bell size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">Bildirim</span>
        </button>
        <button className="flex flex-col items-center gap-0.5">
          <User size={20} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">Profil</span>
        </button>
      </div>
    </div>
  );
};

export default Home;
