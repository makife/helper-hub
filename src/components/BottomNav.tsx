import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Briefcase, Bell, MessageCircle, User } from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

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
      <button onClick={() => navigate("/notifications")} className="flex flex-col items-center gap-0.5">
        <Bell size={20} className={isActive("/notifications") ? "text-primary" : "text-muted-foreground"} />
        <span className={`text-[10px] font-semibold ${isActive("/notifications") ? "text-primary" : "text-muted-foreground"}`}>Bildirim</span>
      </button>
      <button onClick={() => navigate("/messages")} className="flex flex-col items-center gap-0.5">
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
