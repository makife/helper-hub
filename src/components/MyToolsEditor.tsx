import { useEffect, useState } from "react";
import { Wrench, Check, Plus, X, Search as SearchIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ALL_TOOLS, TOOL_GROUPS } from "@/lib/toolsList";

const normalize = (value: string) =>
  value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .trim();

// Profil sayfasına gömülebilen "Aletlerim" düzenleme kartı.
// Kullanıcı hangi aletlere sahip olduğunu işaretler; Home.tsx bunu
// görevlerle eşleştirip "elindeki aletlerle yapabileceğin işler" filtresinde kullanır.
const MyToolsEditor = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownedTools, setOwnedTools] = useState<string[]>([]);
  const [customOwnedTools, setCustomOwnedTools] = useState<string[]>([]);
  const [toolQuery, setToolQuery] = useState("");
  const [customInput, setCustomInput] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("owned_tools, custom_owned_tools")
        .eq("user_id", user.id)
        .maybeSingle();
      setOwnedTools(data?.owned_tools || []);
      setCustomOwnedTools(data?.custom_owned_tools || []);
      setLoading(false);
    })();
  }, [user]);

  const toggleTool = (id: string) => {
    setOwnedTools((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const addCustomTool = () => {
    const value = customInput.trim();
    if (!value) return;
    if (customOwnedTools.some((t) => normalize(t) === normalize(value))) {
      setCustomInput("");
      return;
    }
    setCustomOwnedTools((prev) => [...prev, value]);
    setCustomInput("");
  };

  const removeCustomTool = (index: number) => {
    setCustomOwnedTools((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ owned_tools: ownedTools, custom_owned_tools: customOwnedTools })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast.error("Aletlerin kaydedilemedi.");
      return;
    }
    toast.success("Aletlerin güncellendi!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-card p-6">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCount = ownedTools.length + customOwnedTools.length;
  const selectedLabels = [
    ...ownedTools.map((id) => ALL_TOOLS.find((t) => t.id === id)?.label || id),
    ...customOwnedTools,
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Wrench size={18} className="text-primary" />
          Aletlerim {totalCount > 0 && `(${totalCount})`}
        </span>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-bold text-foreground active:scale-95"
        >
          {expanded ? "Kapat" : totalCount > 0 ? "Düzenle" : "Alet Ekle"}
          <ChevronDown size={13} className={expanded ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>
      </div>

      {!expanded && (
        <>
          {totalCount === 0 ? (
            <p className="text-xs text-muted-foreground">
              Henüz alet eklemedin. Alet gerektiren işlerle eşleşmek için aletlerini ekle.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedLabels.map((label, i) => (
                <span
                  key={`${label}-${i}`}
                  className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {expanded && (
        <>
      <p className="mb-3 text-xs text-muted-foreground">
        Sahip olduğun aletleri işaretle. Alet gerektiren işler haritada senin aletlerinle uyumluysa öne çıkar.
      </p>

      <div className="mb-2 flex items-center gap-2 rounded-xl border-2 border-border bg-background px-3 py-2.5 focus-within:border-primary">
        <SearchIcon size={16} className="text-muted-foreground" />
        <input
          value={toolQuery}
          onChange={(e) => setToolQuery(e.target.value)}
          placeholder="Alet ara..."
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {TOOL_GROUPS.map((group) => {
          const groupTools = ALL_TOOLS.filter(
            (tool) => tool.group === group && (!toolQuery || normalize(tool.label).includes(normalize(toolQuery)))
          );
          if (groupTools.length === 0) return null;
          return (
            <div key={group}>
              <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
                {group}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {groupTools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleTool(tool.id)}
                    className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all active:scale-95 ${
                      ownedTools.includes(tool.id)
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    {ownedTools.includes(tool.id) && <Check size={11} strokeWidth={3} />}
                    {tool.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>


      <div className="mt-4">
        <label className="mb-2 block text-xs font-bold text-muted-foreground">Listede Yoksa Elle Ekle</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomTool();
              }
            }}
            placeholder="Örn: Akvaryum pompası..."
            className="flex-1 rounded-xl border-2 border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={addCustomTool}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground active:scale-95"
          >
            <Plus size={18} />
          </button>
        </div>
        {customOwnedTools.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {customOwnedTools.map((tool, i) => (
              <span
                key={`${tool}-${i}`}
                className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-primary"
              >
                {tool}
                <button type="button" onClick={() => removeCustomTool(i)}>
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="mt-4 w-full rounded-xl gradient-warm py-3 text-sm font-bold text-primary-foreground shadow-soft active:scale-95 disabled:opacity-60"
      >
        {saving ? "Kaydediliyor..." : "Kaydet"}
      </button>
        </>
      )}
    </div>

  );
};

export default MyToolsEditor;
