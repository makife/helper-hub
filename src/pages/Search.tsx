import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";

const categories = [
  { id: "ampul_takma", emoji: "💡", label: "Ampul Takma" },
  { id: "perde_asma", emoji: "🪟", label: "Perde Asma" },
  { id: "mobilya_monte", emoji: "🪑", label: "Mobilya Monte" },
  { id: "duvar_tamir", emoji: "🔨", label: "Duvar Tamir" },
  { id: "kucuk_tamir", emoji: "🔧", label: "Küçük Tamir" },
  { id: "tasima_yardimi", emoji: "📦", label: "Taşıma Yardımı" },
];

const Search = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const filtered = categories.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <div className="flex flex-1 items-center gap-2 rounded-xl border-2 border-border bg-card px-3 py-2.5 focus-within:border-primary">
          <SearchIcon size={16} className="text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ne yaptırmak istiyorsun?"
            className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
          />
        </div>
      </div>

      <div className="px-5 pt-2">
        <p className="mb-3 text-xs font-semibold text-muted-foreground">Kategoriler</p>
        <div className="space-y-2">
          {filtered.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => navigate("/create-task")}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all active:scale-[0.98]"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-sm font-bold text-foreground">{cat.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Search;
