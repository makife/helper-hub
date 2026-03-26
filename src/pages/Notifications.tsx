import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";

const Notifications = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">Bildirimler</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-5">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Bell size={32} className="text-muted-foreground" />
          </div>
          <p className="text-lg font-bold text-foreground">Henüz bildirim yok</p>
          <p className="text-center text-sm text-muted-foreground">
            Yeni iş teklifleri ve güncellemeler burada görünecek.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Notifications;
