import { getLang } from "@/lib/i18n";

export const CURRENCIES = ["TRY", "USD", "EUR", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  TRY: "₺",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export const CURRENCY_LABELS: Record<CurrencyCode, string> = {
  TRY: "Türk Lirası",
  USD: "Dolar",
  EUR: "Euro",
  GBP: "Sterlin",
};

export const currencySymbol = (currency?: string | null) =>
  CURRENCY_SYMBOLS[(currency as CurrencyCode) ?? "TRY"] ?? "₺";

export const getTaskCurrency = (task: { currency?: string | null } | null | undefined) =>
  task?.currency ?? "TRY";

/**
 * Tek noktadan para birimi biçimlendirme.
 * TR: "1.250 ₺"  |  EN: "₺1,250"
 */
export const formatPrice = (amount: number | null | undefined, currency?: string | null) => {
  const value = Number(amount ?? 0);
  const en = getLang() === "en";
  const sym = currencySymbol(currency);
  const num = value.toLocaleString(en ? "en-US" : "tr-TR", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
  return en ? `${sym}${num}` : `${num} ${sym}`;
};
