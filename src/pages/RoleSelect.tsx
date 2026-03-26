import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Briefcase, Wrench } from "lucide-react";

const roles = [
  {
    id: "owner",
    icon: Briefcase,
    title: "İş Sahibi",
    desc: "Evindeki işler için yardım ara, hızlıca birini bul.",
    emoji: "🏠",
  },
  {
    id: "tasker",
    icon: Wrench,
    title: "Tasker",
    desc: "Yakınındaki işleri kabul et, para kazan.",
    emoji: "🔧",
  },
];

const RoleSelect = () => {
  const [selected, setSelected] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 pb-8 pt-12 safe-top safe-bottom">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 className="mb-2 text-3xl font-black text-foreground">Sen Kimsin?</h1>
        <p className="mb-8 text-base text-muted-foreground">
          Rolünü seç. Merak etme, sonradan değiştirebilirsin.
        </p>
      </motion.div>

      <div className="mb-auto flex flex-col gap-4">
        {roles.map((role, i) => (
          <motion.button
            key={role.id}
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            onClick={() => setSelected(role.id)}
            className={`flex items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all active:scale-[0.98] ${
              selected === role.id
                ? "border-primary bg-primary/5 shadow-soft"
                : "border-border bg-card shadow-card"
            }`}
          >
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl ${
                selected === role.id
                  ? "gradient-warm text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {role.emoji}
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">{role.title}</h3>
              <p className="text-sm text-muted-foreground">{role.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        onClick={() => navigate("/profile-setup", { state: { role: selected } })}
        disabled={!selected}
        className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-all active:scale-[0.98] disabled:opacity-40"
      >
        Devam Et
      </motion.button>
    </div>
  );
};

export default RoleSelect;
