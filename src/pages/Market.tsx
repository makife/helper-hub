import { useT } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Coins, RotateCcw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  fetchStorePacks,
  initRevenueCat,
  isNativePlatform,
  purchaseStorePack,
  restorePurchases,
  type PurchaseOutcome,
  type StorePack,
} from "@/lib/revenuecat";


type Pack = {
  id: string;
  productId: string;
  credits: number;
  price: number;
  priceLabel?: string;
  bonus?: number;
  badge?: string;
  storePack?: StorePack;
};

export const CREDIT_PACKS: Pack[] = [
  { id: "starter", productId: "credits_5", credits: 5, price: 49 },
  { id: "standard", productId: "credits_15", credits: 15, price: 129, bonus: 2, badge: "Popüler" },
  { id: "pro", productId: "credits_40", credits: 40, price: 299, bonus: 8, badge: "En Avantajlı" },
  { id: "mega", productId: "credits_100", credits: 100, price: 649, bonus: 25 },
];

const Market = () => {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const native = isNativePlatform();
  const [credits, setCredits] = useState<number>(0);
  const [history, setHistory] = useState<Tables<"credit_transactions">[]>([]);
  const [packs, setPacks] = useState<Pack[]>(CREDIT_PACKS);
  const [selected, setSelected] = useState<Pack | null>(null);
  const [buying, setBuying] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: p }, { data: tx }] = await Promise.all([
      supabase.from("profiles").select("credits").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("credit_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15),
    ]);
    setCredits(p?.credits ?? 0);
    setHistory(tx || []);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Native: mağazadaki gerçek fiyatları çek
  useEffect(() => {
    if (!native || !user) return;
    let cancelled = false;
    (async () => {
      const ready = await initRevenueCat(user.id);
      if (!ready) return;
      try {
        const store = await fetchStorePacks();
        if (cancelled || store.length === 0) return;
        setPacks(
          store.map((sp) => {
            const base = CREDIT_PACKS.find((c) => c.productId === sp.productId);
            return {
              id: sp.productId,
              productId: sp.productId,
              credits: base?.credits ?? sp.credits,
              price: base?.price ?? 0,
              priceLabel: sp.priceString,
              bonus: base?.bonus,
              badge: base?.badge,
              storePack: sp,
            };
          }),
        );
      } catch (e) {
        console.error("Mağaza paketleri alınamadı", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [native, user]);

  /** Webhook krediyi yükleyene kadar profili birkaç kez kontrol eder */
  const waitForCredits = useCallback(
    async (before: number) => {
      if (!user) return false;
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const { data } = await supabase
          .from("profiles")
          .select("credits")
          .eq("user_id", user.id)
          .maybeSingle();
        if ((data?.credits ?? 0) > before) {
          setCredits(data?.credits ?? 0);
          return true;
        }
      }
      return false;
    },
    [user],
  );

  const purchase = async () => {
    if (!user || !selected) return;
    setBuying(true);
    const total = selected.credits + (selected.bonus || 0);

    if (native && selected.storePack) {
      const before = credits;
      const result: PurchaseOutcome = await purchaseStorePack(selected.storePack);
      setBuying(false);
      setSelected(null);
      if (result.ok === false) {
        if (!result.cancelled) toast.error(result.message);
        return;
      }

      toast.success(t("Satın alma alındı, kredin yükleniyor…"));
      const arrived = await waitForCredits(before);
      if (arrived) toast.success(`${total} kredi hesabına eklendi 🎉`);
      else toast.info(t("Kredin birkaç dakika içinde hesabına yansıyacak."));
      load();
      return;
    }

    if (native) {
      setBuying(false);
      setSelected(null);
      toast.error(t("Mağaza paketleri yüklenemedi. Bağlantını kontrol edip tekrar dene."));
      return;
    }

    // Web (test modu)
    const { error: txErr } = await supabase.from("credit_transactions").insert({
      user_id: user.id,
      amount: total,
      kind: "purchase",
      description: `${selected.credits} kredi paketi (test modu)`,
    });

    const { error: upErr } = await supabase
      .from("profiles")
      .update({ credits: credits + total })
      .eq("user_id", user.id);

    setBuying(false);
    setSelected(null);

    if (txErr || upErr) {
      toast.error(t("Satın alma tamamlanamadı."));
      return;
    }
    toast.success(`${total} kredi hesabına eklendi 🎉`);
    load();
  };

  const handleRestore = async () => {
    setRestoring(true);
    const ok = await restorePurchases();
    setRestoring(false);
    if (ok) {
      toast.success(t("Satın almaların kontrol edildi."));
      load();
    } else {
      toast.error(t("Satın almalar geri yüklenemedi."));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">{t("Kredi Marketi")}</h1>
        {native && (
          <button
            onClick={handleRestore}
            disabled={restoring}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-[11px] font-black text-foreground shadow-card disabled:opacity-50"
          >
            <RotateCcw size={13} /> Geri Yükle
          </button>
        )}
      </div>

      <div className="flex-1 space-y-5 px-5 pb-24">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="gradient-warm flex items-center gap-3 rounded-2xl p-5 text-primary-foreground shadow-soft"
        >
          <Coins size={30} />
          <div>
            <p className="text-xs opacity-90">Mevcut kredin</p>
            <p className="text-3xl font-black leading-tight">{credits}</p>
          </div>
          <p className="ml-auto max-w-[45%] text-right text-[11px] font-semibold opacity-90">
            Her yardım çağrısı kabulü 1 kredi harcar
          </p>
        </motion.div>

        <div className="space-y-3">
          {packs.map((pack, i) => (
            <motion.button
              key={pack.id}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.04 * i }}
              onClick={() => setSelected(pack)}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-card active:scale-[0.98]"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Coins size={22} />
              </div>
              <div className="flex-1">
                <p className="text-base font-black text-foreground">
                  {pack.credits} Kredi
                  {pack.bonus ? <span className="ml-1.5 text-xs font-bold text-success">+{pack.bonus} hediye</span> : null}
                </p>
                {pack.badge && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-black text-accent">
                    <Sparkles size={10} /> {pack.badge}
                  </span>
                )}
              </div>
              <p className="text-lg font-black text-primary">{pack.priceLabel ?? `${pack.price} ₺`}</p>
            </motion.button>
          ))}
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          {native
            ? "Ödemeler App Store / Google Play üzerinden alınır. Krediler onaydan hemen sonra yüklenir."
            : "Web sürümünde satın alma test modundadır. Gerçek ödeme mobil uygulamada yapılır."}
        </p>

        <div className="rounded-2xl bg-card p-4 shadow-card">
          <p className="mb-3 text-sm font-black text-foreground">{t("Kredi Hareketleri")}</p>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("Henüz hareket yok.")}</p>
          ) : (
            <div className="space-y-2.5">
              {history.map((h) => (
                <div key={h.id} className="flex items-center justify-between border-b border-border pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <p className="text-xs font-bold text-foreground">{h.description || (h.amount > 0 ? "Kredi yükleme" : "Kredi harcaması")}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <p className={`text-sm font-black ${h.amount > 0 ? "text-success" : "text-destructive"}`}>
                    {h.amount > 0 ? "+" : ""}
                    {h.amount}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!selected}
        title={`${selected ? selected.credits + (selected.bonus || 0) : 0} kredi yükle`}
        description={`${selected?.priceLabel ?? `${selected?.price ?? 0} ₺`} karşılığında kredi hesabına eklenecek.`}
        confirmLabel={t("Satın Al")}
        loading={buying}
        onConfirm={purchase}
        onCancel={() => setSelected(null)}
      />
    </div>
  );
};

export default Market;
