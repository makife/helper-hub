import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { setAppBadge } from "@/lib/feedback";

let channelSequence = 0;

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

    // Bu hook aynı ekranda hem üst çubukta hem alt menüde kullanılabiliyor.
    // Her kullanım benzersiz kanal açmalı; aynı isimdeki abone kanala tekrar
    // callback eklemek native istemcide uygulamayı çökertiyor.
    const channelId = ++channelSequence;
    const channel = supabase
      .channel(`unread-notifications-${user.id}-${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void fetchCount(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        () => void fetchCount(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
};
