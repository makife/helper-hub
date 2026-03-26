import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Search, Plus, Bell, Wrench, User } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { toast } from "sonner";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, toggleRole } = useRole();

  const isActive = (path: string) => location.pathname === path;

  const handleToggle = async () => {
    await toggleRole();
    const newRole = role === "owner" ? "tasker" : "owner";
    toast.success(newRole === "tasker" ? "İş Al moduna geçildi 🔧" : "İş Ver moduna geçildi 👤");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-border bg-card px-4 pb-2 pt-3 safe-bottom">
      <button onClick={() => navigate("/home")} className="flex flex-col items-center gap-0.5">
        <MapPin size={20} className={isActive("/home") ? "text-primary" : "text-muted-foreground"} />
        <span className={`text-[10px] font-bold ${isActive("/home") ? "text-primary" : "text-muted-foreground"}`}>Keşfet</span>
      </button>
      <button onClick={() => navigate("/my-tasks")} className="flex flex-col items-center gap-0.5">
        <Search size={20} className={isActive("/my-tasks") ? "text-primary" : "text-muted-foreground"} />
        <span className={`text-[10px] font-semibold ${isActive("/my-tasks") ? "text-primary" : "text-muted-foreground"}`}>İşlerim</span>
      </button>
      <button
        onClick={() => navigate("/create-task")}
        className="gradient-warm -mt-5 flex h-14 w-14 items-center justify-center rounded-full shadow-soft"
      >
        <Plus size={24} className="text-primary-foreground" />
      </button>
      <button onClick={() => navigate("/notifications")} className="flex flex-col items-center gap-0.5">
        <Bell size={20} className={isActive("/notifications") ? "text-primary" : "text-muted-foreground"} />
        <span className={`text-[10px] font-semibold ${isActive("/notifications") ? "text-primary" : "text-muted-foreground"}`}>Bildirim</span>
      </button>
      <button onClick={handleToggle} className="flex flex-col items-center gap-0.5">
        {role === "owner" ? (
          <>
            <Wrench size={20} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">İş Al</span>
          </>
        ) : (
          <>
            <User size={20} className="text-primary" />
            <span className="text-[10px] font-bold text-primary">İş Ver</span>
          </>
        )}
      </button>
    </div>
  );
};

export default BottomNav;
