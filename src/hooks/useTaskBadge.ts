import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { uniqueChannel } from "@/lib/realtime";

/**
 * İşverenin onay bekleyen yardım çağrısı sayısı (realtime).
 * BottomNav'daki "İşlerim" ikonunda badge olarak gösterilir.
 */
export const useTaskBadge = () => {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const fetchCount = async () => {
      const { count: c } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id)
        .eq("status", "pending_confirm");
      setCount(c ?? 0);
    };

    fetchCount();

    const channel = supabase
      .channel(uniqueChannel(`owner-pending-tasks-${user.id}`))
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return count;
};
