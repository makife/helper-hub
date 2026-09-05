import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type OfferRow = Tables<"task_offers">;

export const fetchMyOffer = async (taskId: string, taskerId: string) => {
  const { data } = await supabase
    .from("task_offers")
    .select("*")
    .eq("task_id", taskId)
    .eq("tasker_id", taskerId)
    .maybeSingle();
  return data as OfferRow | null;
};

export const fetchTaskOffers = async (taskId: string) => {
  const { data } = await supabase
    .from("task_offers")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });
  return (data ?? []) as OfferRow[];
};

export const createOffer = async (taskId: string, taskerId: string, amount: number) => {
  const { error } = await supabase
    .from("task_offers")
    .insert({ task_id: taskId, tasker_id: taskerId, amount, status: "pending" });
  return { ok: !error, code: error?.code, message: error?.message };
};

export const respondToOffer = async (offerId: string, accept: boolean) => {
  const { data, error } = await supabase.rpc("respond_to_offer", {
    _offer_id: offerId,
    _accept: accept,
  });
  if (error) return "error";
  return data as string;
};

export const confirmAcceptedOffer = async (offerId: string) => {
  const { data, error } = await supabase.rpc("confirm_accepted_offer", { _offer_id: offerId });
  if (error) {
    const msg = `${error.message} ${(error as { details?: string }).details ?? ""}`;
    if (msg.includes("Yetersiz kredi")) return "credits";
    if (msg.includes("Bekleyen degerlendirme")) return "reviews";
    if (msg.includes("aktif bir isin var")) return "busy";
    if (msg.includes("Kontenjan dolu")) return "quota_full";
    return "error";
  }
  return data as string;
};

