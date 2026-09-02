import { useNavigate, useLocation } from "react-router-dom";
import { MapPin, Briefcase, MessageCircle, User, Plus } from "lucide-react";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useTaskBadge } from "@/hooks/useTaskBadge";
import { useT } from "@/lib/i18n";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const unread = useUnreadMessages();
  const pendingConfirmCount = useTaskBadge();
  const unreadNotifications = useUnreadNotifications();
  const pulseTasks = pendingConfirmCount > 0 || unreadNotifications > 0;
  const t = useT();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[500] flex items-end justify-between border-t border-border bg-card px-2 pb-6 pt-3 safe-bottom shadow-[0_-4px_20px_-5px_hsl(var(--foreground)/0.05)]">
      <button
        onClick={() => navigate("/home")}
        className="group flex flex-1 flex-col items-center gap-1 transition-all duration-200 active:scale-[0.96]"
      >
        <div className="p-1">
          <MapPin
            size={24}
            strokeWidth={isActive("/home") ? 2.5 : 2}
            className={isActive("/home") ? "text-primary" : "text-muted-foreground group-hover:text-primary"}
          />
        </div>
        <span className={`text-[11px] ${isActive("/home") ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-primary"}`}>
          {t("Keşfet")}
        </span>
      </button>

      <button
        onClick={() => navigate("/my-tasks")}
        className="group relative flex flex-1 flex-col items-center gap-1 transition-all duration-200 active:scale-[0.96]"
      >
        <div className={`relative rounded-full p-1 ${pulseTasks ? "pulse-ring" : ""}`}>
          {pendingConfirmCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black text-destructive-foreground">
              {pendingConfirmCount > 9 ? "9+" : pendingConfirmCount}
            </span>
          )}
          <Briefcase
            size={24}
            strokeWidth={isActive("/my-tasks") ? 2.5 : 2}
            className={isActive("/my-tasks") ? "text-primary" : "text-muted-foreground group-hover:text-primary"}
          />
        </div>
        <span className={`text-[11px] ${isActive("/my-tasks") ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-primary"}`}>
          {t("İşlerim")}
        </span>
      </button>

      <button
        onClick={() => navigate("/create-task")}
        className="relative -mt-9 flex flex-1 flex-col items-center gap-1 transition-transform active:scale-[0.96]"
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
        <span className="text-[10px] font-bold text-[#E5600A]">{t("Yardım Çağrısı")}</span>
      </button>

      <button
        onClick={() => navigate("/messages")}
        className="group relative flex flex-1 flex-col items-center gap-1 transition-all duration-200 active:scale-[0.96]"
      >
        <div className="relative p-1">
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
          <MessageCircle
            size={24}
            strokeWidth={isActive("/messages") ? 2.5 : 2}
            className={isActive("/messages") ? "text-primary" : "text-muted-foreground group-hover:text-primary"}
          />
        </div>
        <span className={`text-[11px] ${isActive("/messages") ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-primary"}`}>
          {t("Mesajlar")}
        </span>
      </button>

      <button
        onClick={() => navigate("/profile")}
        className="group flex flex-1 flex-col items-center gap-1 transition-all duration-200 active:scale-[0.96]"
      >
        <div className="p-1">
          <User
            size={24}
            strokeWidth={isActive("/profile") ? 2.5 : 2}
            className={isActive("/profile") ? "text-primary" : "text-muted-foreground group-hover:text-primary"}
          />
        </div>
        <span className={`text-[11px] ${isActive("/profile") ? "font-semibold text-primary" : "font-medium text-muted-foreground group-hover:text-primary"}`}>
          {t("Profil")}
        </span>
      </button>
    </div>
  );
};

export default BottomNav;
