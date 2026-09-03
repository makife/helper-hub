import { useEffect, useState } from "react";
import { formatPrice, getTaskCurrency } from "@/lib/currency";
import { motion } from "framer-motion";
import { X, Clock, MapPin, Star, User, Users, TrendingDown, Wrench, UserCheck, Home, BadgeCheck, Eye, Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";
import { useLivePrice, formatCountdown } from "@/lib/dynamicPricing";
import { acceptTask, leaveTask } from "@/lib/assignments";
import { createOffer, fetchMyOffer, fetchTaskOffers, respondToOffer, confirmAcceptedOffer, type OfferRow } from "@/lib/offers";
import { ALL_TOOLS } from "@/lib/toolsList";
import type { Tables } from "@/integrations/supabase/types";



type TaskWithUI = Tables<"tasks"> & {
  emoji: string;
  lat: number;
  lng: number;
};

type Props = {
  task: TaskWithUI;
  onClose: () => void;
  onAccepted?: (task: TaskWithUI) => void;
};

const TaskDetailSheet = ({ task, onClose, onAccepted }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [owner, setOwner] = useState<Tables<"profiles"> | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [iAccepted, setIAccepted] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [myOffer, setMyOffer] = useState<OfferRow | null>(null);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerBusy, setOfferBusy] = useState(false);
  const isOwner = user?.id === task.owner_id;
  const currency = getTaskCurrency(task);

  const livePrice = useLivePrice(task);
  const needed = task.person_count ?? 1;

  const toolLabels = [
    ...(task.required_tools || []).map(
      (id) => ALL_TOOLS.find((t) => t.id === id)?.label || id
    ),
    ...(task.custom_tools || []),
  ];

  // Görüntüleme kaydı (iş veren hariç)
  useEffect(() => {
    if (!user || user.id === task.owner_id) return;
    supabase
      .from("task_views")
      .upsert(
        { task_id: task.id, viewer_id: user.id, viewed_at: new Date().toISOString() },
        { onConflict: "task_id,viewer_id" }
      )
      .then(() => {});
  }, [task.id, task.owner_id, user?.id]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", task.owner_id)
      .maybeSingle()
      .then(({ data }) => setOwner(data));
  }, [task.owner_id]);

  const loadAssignments = async () => {
    const { data } = await supabase
      .from("task_assignments")
      .select("tasker_id")
      .eq("task_id", task.id)
      .eq("status", "accepted");
    setAcceptedCount(data?.length ?? 0);
    setIAccepted(!!user && (data || []).some((a) => a.tasker_id === user.id));
  };

  useEffect(() => {
    loadAssignments();
    const channel = supabase
      .channel(`task-assignments-${task.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_assignments", filter: `task_id=eq.${task.id}` },
        () => loadAssignments()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, user?.id]);

  useEffect(() => {
    if (user?.id !== task.owner_id) return;
    const loadViewerCount = async () => {
      const { count } = await supabase
        .from("task_views")
        .select("*", { count: "exact", head: true })
        .eq("task_id", task.id);
      setViewerCount(count ?? 0);
    };
    loadViewerCount();
    const channel = supabase
      .channel(`task-views-${task.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_views", filter: `task_id=eq.${task.id}` },
        () => loadViewerCount()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, task.owner_id, user?.id]);

  const handleAccept = async () => {

    if (!user) return;
    setAccepting(true);
    const price = livePrice ? livePrice.price : task.current_price ?? task.price;
    const result = await acceptTask(task.id, user.id, price);
    setAccepting(false);

    if (result.ok !== true) {
      if (result.reason === "credits") {
        toast.error(result.message, {
          action: { label: t("Kredi Al"), onClick: () => { onClose(); navigate("/market"); } },
        });
        return;
      }
      toast.error(result.message);
      if (result.reason === "already") {
        onClose();
        navigate(`/task/${task.id}`);
      }
      return;
    }


    toast.success(
      needed > 1
        ? t("İş kabul edildi! ({count}/{needed} kişi) 🎉", { count: acceptedCount + 1, needed })
        : t("İş kabul edildi! 🎉")
    );
    onAccepted?.(task);
    onClose();
    navigate(`/task/${task.id}`);
  };

  const loadOffers = async () => {
    if (!user) return;
    if (isOwner) setOffers(await fetchTaskOffers(task.id));
    else setMyOffer(await fetchMyOffer(task.id, user.id));
  };

  useEffect(() => {
    loadOffers();
    const channel = supabase
      .channel(`task-offers-${task.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_offers", filter: `task_id=eq.${task.id}` },
        () => loadOffers()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, user?.id, isOwner]);

  const handleSendOffer = async () => {
    if (!user) return;
    const amount = Math.round(Number(offerAmount));
    if (!amount || amount <= task.price) {
      toast.error(t("Teklifin ilan fiyatının üzerinde olmalı."));
      return;
    }
    setOfferBusy(true);
    const res = await createOffer(task.id, user.id, amount);
    setOfferBusy(false);
    if (!res.ok) {
      toast.error(res.code === "23505" ? t("Bu çağrıya zaten teklif verdin.") : t("Teklif gönderilemedi."));
      return;
    }
    toast.success(t("Teklifin gönderildi. Çağrı sahibi yanıtlayınca bildirim alacaksın."));
    setOfferOpen(false);
    setOfferAmount("");
    loadOffers();
  };

  const handleRespond = async (offerId: string, accept: boolean) => {
    setOfferBusy(true);
    const res = await respondToOffer(offerId, accept);
    setOfferBusy(false);
    if (res === "accepted") toast.success(t("Teklif kabul edildi. El atanın onayı bekleniyor."));
    else if (res === "rejected") toast.success(t("Teklif reddedildi."));
    else toast.error(t("İşlem yapılamadı."));
    loadOffers();
  };

  const handleConfirmOffer = async () => {
    if (!myOffer) return;
    setOfferBusy(true);
    const res = await confirmAcceptedOffer(myOffer.id);
    setOfferBusy(false);
    if (res === "ok") {
      toast.success(t("İş kabul edildi! 🎉"));
      onAccepted?.(task);
      onClose();
      navigate(`/task/${task.id}`);
      return;
    }
    if (res === "credits") {
      toast.error(t("Kredin yetersiz. Kredi Marketi'nden kredi yükleyebilirsin."), {
        action: { label: t("Kredi Al"), onClick: () => { onClose(); navigate("/market"); } },
      });
      return;
    }
    toast.error(t("İşlem yapılamadı."));
  };

  const handleLeave = async () => {
    if (!user) return;
    setAccepting(true);
    const ok = await leaveTask(task.id, user.id);
    setAccepting(false);
    if (!ok) { toast.error(t("İşten ayrılamadın, tekrar dene.")); return; }
    toast.success(t("İşten ayrıldın."));
    loadAssignments();
  };


  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[1000] bg-foreground/20"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="fixed bottom-0 left-0 right-0 z-[1001] max-h-[85vh] overflow-y-auto rounded-t-3xl bg-card p-6 shadow-lg"
      >
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-2xl">
              {task.emoji}
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">{t(task.title)}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={12} />
                <span>~{task.estimated_minutes} {t("dk")}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">{task.description}</p>

        {/* Owner Profile */}
        {owner && (
          <button
            onClick={() => navigate(`/profile/${owner.user_id}`)}
            className="mb-4 flex w-full items-center gap-3 rounded-xl bg-muted/50 p-3 text-left transition-all active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              {owner.avatar_url ? (
                <img src={owner.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={18} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <p className="flex items-center gap-1 text-sm font-bold text-foreground">
                {owner.full_name}
                {owner.id_verification_status === "verified" && (
                  <BadgeCheck size={14} className="text-primary" aria-label={t("Kimliği doğrulanmış")} />
                )}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Star size={10} className="text-accent" />
                <span>{owner.rating || "0.0"}</span>
                <span>·</span>
                <span>{t("{count} iş", { count: owner.total_completed || 0 })}</span>
              </div>
            </div>
            <span className="text-xs text-primary font-semibold">{t("Profili Gör →")}</span>
          </button>
        )}

        <div className="mb-4 rounded-xl bg-muted/50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t("Ücret")}</span>
            <div className="text-right">
              {livePrice && livePrice.price < livePrice.basePrice && (
                <span className="mr-2 text-sm font-semibold text-muted-foreground line-through">
                  {formatPrice(livePrice.basePrice, getTaskCurrency(task))}
                </span>
              )}
              <span className="text-2xl font-black text-primary">
                {formatPrice(livePrice ? livePrice.price : task.current_price || task.price, getTaskCurrency(task))}
              </span>
            </div>
          </div>
          {livePrice?.isDropping && (
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-primary">
              <TrendingDown size={12} />
              {t("Fiyat düşüyor — sonraki düşüşe")} {formatCountdown(livePrice.msToNextDrop)}
              <span className="text-muted-foreground">({t("alt sınır")} {formatPrice(livePrice.minPrice, getTaskCurrency(task))})</span>
            </p>
          )}
          {livePrice?.atFloor && (
            <p className="mt-1 text-xs font-semibold text-muted-foreground">
              {t("En düşük ücrete ulaşıldı")} ({formatPrice(livePrice.minPrice, getTaskCurrency(task))})
            </p>
          )}
          {task.urgency === "urgent" && (
            <p className="mt-1 text-xs font-semibold text-destructive">{t("🔥 Acil iş — hemen başlaman bekleniyor")}</p>
          )}
        </div>
        {/* Kişi kontenjanı */}
        <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/50 p-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users size={14} className="text-primary" />
            <span>{t("Kişi kontenjanı")}</span>
          </div>
          <span className="text-sm font-black text-foreground">
            {acceptedCount}/{needed} {t("dolu")}
          </span>
        </div>

        {user?.id === task.owner_id && viewerCount > 0 && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Eye size={14} className="text-primary" />
              <span>{t("Görüntüleyenler")}</span>
            </div>
            <span className="text-sm font-black text-foreground">{viewerCount}</span>
          </div>
        )}

        {isOwner && offers.length > 0 && (
          <div className="mb-4 rounded-xl bg-muted/50 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Handshake size={14} className="text-primary" />
              <span>{t("Gelen Teklifler")}</span>
            </div>
            <div className="space-y-2">
              {offers.map((o) => (
                <div key={o.id} className="rounded-xl bg-card p-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => navigate(`/profile/${o.tasker_id}`)}
                      className="text-xs font-semibold text-primary"
                    >
                      {t("Profili Gör →")}
                    </button>
                    <span className="text-lg font-black text-foreground">
                      {formatPrice(o.amount, currency)}
                    </span>
                  </div>
                  {o.status === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleRespond(o.id, true)}
                        disabled={offerBusy}
                        className="gradient-warm flex-1 rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                      >
                        {t("Teklifi Kabul Et")}
                      </button>
                      <button
                        onClick={() => handleRespond(o.id, false)}
                        disabled={offerBusy}
                        className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-bold text-muted-foreground disabled:opacity-50"
                      >
                        {t("Reddet")}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-muted-foreground">
                      {o.status === "accepted"
                        ? t("Kabul edildi — el atanın onayı bekleniyor")
                        : o.status === "confirmed"
                          ? t("Onaylandı")
                          : t("Reddedildi")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {needed > 1 && task.wait_deadline && (

          <div className="mb-4 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
            {new Date(task.wait_deadline).getTime() - Date.now() > 5 * 60 * 1000 ? (
              <>
                {t("Yardım çağrısı yapan, el atan kontenjanının dolmasını ")}
                <span className="font-black text-foreground">
                  {formatCountdown(new Date(task.wait_deadline).getTime() - Date.now())}
                </span>
                {t(" daha beklemektedir. Bu süreden önce işe başlanamayacak. Süre dolunca çağrı yapan dilerse çağrıyı sonlandırır veya mevcut kontenjanla işi başlatabilir. Süreçle ilgili bildirim gönderilecektir.")}
              </>
            ) : new Date(task.wait_deadline).getTime() > Date.now() ? (
              t("Bekleme süresi bitmek üzere; çağrı yapan şu anda dilerse çağrıyı sonlandırabilir veya mevcut kontenjanla işi başlatabilir. Süreçle ilgili bildirim gönderilecektir.")
            ) : (
              <>{t("Bekleme süresi doldu, çağrı yapan kararını verdiğinde bilgilendirileceksin.")}</>
            )}
          </div>
        )}

        {task.needs_tools && (
          <div className="mb-4 rounded-xl bg-muted/50 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wrench size={14} className="text-primary" />
                <span>{t("Alet/Edevat Gerekiyor")}</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-primary">
                {task.tool_provider === "owner" ? (
                  <>
                    <Home size={12} /> {t("Ben Sağlıyorum")}
                  </>
                ) : (
                  <>
                    <UserCheck size={12} /> {t("El Atan Getirsin")}
                  </>
                )}
              </span>
            </div>
            {toolLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {toolLabels.map((label, i) => (
                  <span
                    key={`${label}-${i}`}
                    className="rounded-lg bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary"
                  >
                    {t(label)}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {task.address_note && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin size={14} className="text-primary" />
            <span>{task.address_note}</span>
          </div>
        )}

        {user?.id !== task.owner_id && (
          iAccepted ? (
            <div className="space-y-2">
              <button
                onClick={() => { onClose(); navigate(`/task/${task.id}`); }}
                className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98]"
              >
                {t("İşi Aç 💬")}
              </button>
              <button
                onClick={handleLeave}
                disabled={accepting}
                className="w-full rounded-2xl border border-border px-6 py-3 text-sm font-bold text-muted-foreground disabled:opacity-50"
              >
                {t("İşten Ayrıl")}
              </button>
            </div>
          ) : acceptedCount >= needed ? (
            <div className="w-full rounded-2xl bg-muted px-6 py-4 text-center text-sm font-bold text-muted-foreground">
              {t("Kontenjan doldu ({count}/{needed})", { count: needed, needed })}
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="gradient-warm w-full rounded-2xl px-6 py-4 text-lg font-bold text-primary-foreground shadow-soft transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {accepting
                  ? t("Kabul ediliyor...")
                  : needed > 1
                    ? t("Kabul Et ✋ ({count}/{needed})", { count: acceptedCount, needed })
                    : t("Kabul Et ✋")}
              </button>
              <p className="text-center text-[11px] leading-snug text-muted-foreground">
                {t("Ödeme taraflar arasında elden yapılır. Bi' El At, ödeme anlaşmazlıklarında taraf olmaz.")}
              </p>
            </div>
          )
        )}

      </motion.div>
    </>
  );
};

export default TaskDetailSheet;
