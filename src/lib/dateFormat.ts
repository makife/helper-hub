import { getLang } from "@/lib/i18n";

const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const months = () => (getLang() === "en" ? MONTHS_EN : MONTHS_TR);

export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = months()[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const isThisYear = d.getFullYear() === new Date().getFullYear();
  const en = getLang() === "en";
  const datePart = isThisYear
    ? en ? `${month} ${day}` : `${day} ${month}`
    : en ? `${month} ${day}, ${year}` : `${day} ${month} ${year}`;
  return `${datePart}, ${hour}:${min}`;
};

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = months()[d.getMonth()];
  const year = d.getFullYear();
  const isThisYear = d.getFullYear() === new Date().getFullYear();
  const en = getLang() === "en";
  if (isThisYear) return en ? `${month} ${day}` : `${day} ${month}`;
  return en ? `${month} ${day}, ${year}` : `${day} ${month} ${year}`;
};

export const timeAgo = (date: string) => {
  const en = getLang() === "en";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return en ? "now" : "şimdi";
  if (mins < 60) return en ? `${mins} min` : `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return en ? `${hours} h` : `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return en ? `${days} d` : `${days} gün`;
  return formatDate(date);
};
