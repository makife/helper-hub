import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Search, Plus, Bell, User, Wrench } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [role, setRole] = useState<"owner" | "tasker">("owner");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.role) setRole(data.role);
      });
  }, [user]);

  const toggleRole = async () => {
    if (!user) return;
    const newRole = role === "owner" ? "tasker" : "owner";
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", user.id);
    if (!error) setRole(newRole);
  };

  const isActive = (path: string) => location.pathname === path;

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
      <button onClick={toggleRole} className="flex flex-col items-center gap-0.5">
        {role === "owner" ? (
          <>
            <Wrench size={20} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold text-muted-foreground">Tasker ol</span>
          </>
        ) : (
          <>
            <User size={20} className="text-primary" />
            <span className="text-[10px] font-bold text-primary">Tasker ✓</span>
          </>
        )}
      </button>
    </div>
  );
};

export default BottomNav;
