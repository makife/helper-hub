import { getLang, type Lang } from "@/lib/i18n";

const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_PT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_AR = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const monthsFor = (lang: Lang) => (lang === "en" ? MONTHS_EN : lang === "ar" ? MONTHS_AR : lang === "pt" ? MONTHS_PT : MONTHS_TR);
const months = () => monthsFor(getLang());

const datePartFor = (lang: Lang, day: number, month: string, year: number, withYear: boolean) => {
  if (lang === "en") return withYear ? `${month} ${day}, ${year}` : `${month} ${day}`;
  return withYear ? `${day} ${month} ${year}` : `${day} ${month}`;
};

export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const lang = getLang();
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const isThisYear = d.getFullYear() === new Date().getFullYear();
  const datePart = datePartFor(lang, d.getDate(), months()[d.getMonth()], d.getFullYear(), !isThisYear);
  return `${datePart}, ${hour}:${min}`;
};

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  const lang = getLang();
  const isThisYear = d.getFullYear() === new Date().getFullYear();
  return datePartFor(lang, d.getDate(), months()[d.getMonth()], d.getFullYear(), !isThisYear);
};

export const timeAgoIn = (date: string, lang: Lang) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const unit = (en: string, tr: string, ar: string, pt: string) => (lang === "en" ? en : lang === "ar" ? ar : lang === "pt" ? pt : tr);
  if (mins < 1) return unit("now", "şimdi", "الآن", "agora");
  if (mins < 60) return `${mins} ${unit("min", "dk", "د", "min")}`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ${unit("h", "sa", "س", "h")}`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${unit("d", "gün", "ي", "d")}`;
  const d = new Date(date);
  const year = d.getFullYear();
  const isThisYear = year === new Date().getFullYear();
  return datePartFor(lang, d.getDate(), monthsFor(lang)[d.getMonth()], year, !isThisYear);
};

export const timeAgo = (date: string) => timeAgoIn(date, getLang());
