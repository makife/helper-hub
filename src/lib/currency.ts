import { getLang, localeTag } from "@/lib/i18n";

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
  const lang = getLang();
  const symbolFirst = lang === "en";
  const sym = currencySymbol(currency);
  const num = value.toLocaleString(localeTag(lang), {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
  return symbolFirst ? `${sym}${num}` : `${num} ${sym}`;
};

/** Kredi paketleri için sabit Euro fiyatları (İngilizce dilde gösterilir) */
export const TRY_TO_EUR_RATE = 0.026;

/**
 * Kredi paketi fiyatı: Türkçede ₺, İngilizcede € olarak gösterilir.
 * eurPrice verilirse doğrudan kullanılır, verilmezse kur ile hesaplanır.
 */
export const formatPackPrice = (tryPrice: number, eurPrice?: number) => {
  const lang = getLang();
  if (lang !== "en" && lang !== "pt" && lang !== "es") return formatPrice(tryPrice, "TRY");
  const value = eurPrice ?? Math.round(tryPrice * TRY_TO_EUR_RATE * 100) / 100;
  const formatted = value.toLocaleString(localeTag(lang), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return lang === "pt" || lang === "es" ? `${formatted} €` : `€${formatted}`;
};
