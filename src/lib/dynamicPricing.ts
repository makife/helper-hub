import { useEffect, useState } from "react";

/** Dutch auction ayarları: her 9 dakikada %9 düşüş, tabanda min_price */
export const DROP_INTERVAL_MS = 9 * 60 * 1000;
export const DROP_RATE = 0.09;

export type PriceTask = {
  price: number;
  current_price?: number | null;
  min_price?: number | null;
  urgency?: string | null;
  status?: string | null;
  price_drop_started_at?: string | null;
};

export type PriceState = {
  price: number;
  /** Fiyat düşüşü aktif mi */
  isDropping: boolean;
  /** Bir sonraki düşüşe kalan ms */
  msToNextDrop: number;
  /** Tabana ulaşıldı mı */
  atFloor: boolean;
  minPrice: number;
  basePrice: number;
  dropsApplied: number;
};

export function computePrice(task: PriceTask, now: number = Date.now()): PriceState {
  const basePrice = task.price;
  const minPrice = task.min_price ?? basePrice;
  const locked =
    task.urgency === "urgent" ||
    !task.price_drop_started_at ||
    (task.status != null && task.status !== "open");

  if (locked || minPrice >= basePrice) {
    return {
      price: task.current_price ?? basePrice,
      isDropping: false,
      msToNextDrop: 0,
      atFloor: false,
      minPrice,
      basePrice,
      dropsApplied: 0,
    };
  }

  const started = new Date(task.price_drop_started_at!).getTime();
  const elapsed = Math.max(0, now - started);
  const drops = Math.floor(elapsed / DROP_INTERVAL_MS);
  const raw = Math.round(basePrice * Math.pow(1 - DROP_RATE, drops));
  const price = Math.max(minPrice, raw);
  const atFloor = price <= minPrice;

  return {
    price,
    isDropping: !atFloor,
    msToNextDrop: atFloor ? 0 : DROP_INTERVAL_MS - (elapsed % DROP_INTERVAL_MS),
    atFloor,
    minPrice,
    basePrice,
    dropsApplied: drops,
  };
}

/** Her saniye güncellenen canlı fiyat */
export function useLivePrice(task: PriceTask | null | undefined): PriceState | null {
  const [state, setState] = useState<PriceState | null>(() => (task ? computePrice(task) : null));

  useEffect(() => {
    if (!task) {
      setState(null);
      return;
    }
    setState(computePrice(task));
    const id = setInterval(() => setState(computePrice(task)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    task?.price,
    task?.current_price,
    task?.min_price,
    task?.urgency,
    task?.status,
    task?.price_drop_started_at,
  ]);

  return state;
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
