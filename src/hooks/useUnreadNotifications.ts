import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { setAppBadge } from "@/lib/feedback";

/** Okunmamış bildirim sayısı (kalıcı bildirimler + gelen mesajlar). */
export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      void setAppBadge(0);
      return;
    }

    const fetchCount = async () => {
      const [{ count: n }, { count: m }] = await Promise.all([
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("receiver_id", user.id)
          .eq("is_read", false),
      ]);
      const total = (n ?? 0) + (m ?? 0);
      setCount(total);
      void setAppBadge(total);
    };

    fetchCount();

    const channel = supabase
      .channel(`unread-notifications-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => fetchCount())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => fetchCount())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
};
