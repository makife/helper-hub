import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useT } from "@/lib/i18n";
import { localizeNotificationText } from "@/lib/notificationText";

type NotificationRow = {
  id: string;
  user_id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  task_id: string | null;
};

type MessageRow = {
  id: string;
  receiver_id: string;
  sender_id: string;
  content: string | null;
  task_id: string | null;
};

const pathForNotification = (type: string | null, taskId: string | null) => {
  if (type === "message") return "/messages";
  if (taskId) return `/task/${taskId}`;
  return "/notifications";
};

/**
 * Uygulama açıkken gelen tüm bildirimleri (kabul, ayrılma, tamamlama,
 * süre dolumu, yeni mesaj...) anlık toast olarak gösterir.
 * Push bildirimleri arka planda çalışır; bu katman ön plandaki boşluğu doldurur.
 */
const GlobalNotifier = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useT();
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;
  const seen = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const show = (title: string, body: string, path: string) => {
      toast(title, {
        description: body || undefined,
        duration: 6000,
        action: { label: t("Görüntüle"), onClick: () => navigate(path) },
      });
    };

    const channel = supabase
      .channel(`global-notifier-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async ({ new: row }) => {
          const n = row as NotificationRow;
          if (seen.current.has(`n-${n.id}`)) return;
          seen.current.add(`n-${n.id}`);
          show(
            localizeNotificationText(n.title ?? "", t),
            localizeNotificationText(n.body ?? "", t),
            pathForNotification(n.type, n.task_id),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        async ({ new: row }) => {
          const m = row as MessageRow;
          if (seen.current.has(`m-${m.id}`)) return;
          seen.current.add(`m-${m.id}`);
          // Kullanıcı zaten mesajlar ekranındaysa toast gösterme.
          if (pathRef.current.startsWith("/messages")) return;

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", m.sender_id)
            .maybeSingle();

          show(
            `${profile?.full_name || t("Kullanıcı")} ${t("mesaj gönderdi")}`,
            m.content ?? "",
            "/messages",
          );
        },
      )
      .subscribe();

    // Native push uygulama açıkken geldiğinde de toast göster.
    const onNativePush = (event: Event) => {
      const detail = (event as CustomEvent).detail as
        | { title?: string; body?: string; data?: Record<string, unknown> }
        | undefined;
      if (!detail?.title) return;
      const data = detail.data ?? {};
      const path = typeof data.path === "string" && data.path.startsWith("/") ? data.path : "/notifications";
      show(localizeNotificationText(detail.title, t), localizeNotificationText(detail.body ?? "", t), path);
    };
    window.addEventListener("native-push-received", onNativePush);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("native-push-received", onNativePush);
    };
  }, [user, navigate, t]);

  return null;
};

export default GlobalNotifier;
