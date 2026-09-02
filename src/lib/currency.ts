import { getLang } from "@/lib/i18n";

/**
 * Tek noktadan para birimi biçimlendirme.
 * TR: "1.250 ₺"  |  EN: "₺1,250"
 */
export const formatPrice = (amount: number | null | undefined) => {
  const value = Number(amount ?? 0);
  const en = getLang() === "en";
  const num = value.toLocaleString(en ? "en-US" : "tr-TR", {
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  });
  return en ? `₺${num}` : `${num} ₺`;
};
