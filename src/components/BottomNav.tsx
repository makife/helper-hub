import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Briefcase, MessageCircle, User, Plus } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const unread = useUnreadMessages();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-card px-4 pb-2 pt-3 safe-bottom">
      <button onClick={() => navigate("/home")} className="flex flex-col items-center gap-0.5">
        <MapPin size={20} className={isActive("/home") ? "text-primary" : "text-muted-foreground"} />
        <span className={`text-[10px] font-bold ${isActive("/home") ? "text-primary" : "text-muted-foreground"}`}>Keşfet</span>
      </button>
      <button onClick={() => navigate("/my-tasks")} className="flex flex-col items-center gap-0.5">
        <Briefcase size={20} className={isActive("/my-tasks") ? "text-primary" : "text-muted-foreground"} />
        <span className={`text-[10px] font-semibold ${isActive("/my-tasks") ? "text-primary" : "text-muted-foreground"}`}>İşlerim</span>
      </button>

      <button
        onClick={() => navigate("/create-task")}
        className="relative -mt-9 flex flex-col items-center gap-1 active:scale-[0.96] transition-transform"
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-card"
          style={{
            background: "linear-gradient(180deg, #FFA84D 0%, #FB7A24 55%, #E5600A 100%)",
            boxShadow:
              "inset 0 1px 2px rgba(255,255,255,0.55), inset 0 -3px 4px rgba(0,0,0,0.2), 0 6px 14px rgba(229,96,10,0.45)",
          }}
        >
          <Plus size={28} className="text-white drop-shadow-sm" strokeWidth={3} />
        </div>
        <span className="text-[10px] font-bold text-[#E5600A]">Yardım Çağrısı</span>
      </button>

      <button onClick={() => navigate("/messages")} className="relative flex flex-col items-center gap-0.5">
        {unread > 0 && (
          <span className="absolute -top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        <MessageCircle size={20} className={isActive("/messages") ? "text-primary" : "text-muted-foreground"} />
        <span className={`text-[10px] font-semibold ${isActive("/messages") ? "text-primary" : "text-muted-foreground"}`}>Mesajlar</span>
      </button>
      <button onClick={() => navigate("/profile")} className="flex flex-col items-center gap-0.5">
        <User size={20} className={isActive("/profile") ? "text-primary" : "text-muted-foreground"} />
        <span className={`text-[10px] font-semibold ${isActive("/profile") ? "text-primary" : "text-muted-foreground"}`}>Profil</span>
      </button>
    </div>
  );
};

export default BottomNav;
