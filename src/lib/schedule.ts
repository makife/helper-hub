export type SlotId = "morning" | "afternoon" | "evening";

export const SCHEDULE_SLOTS: { id: SlotId; label: string; startHour: number; endHour: number }[] = [
  { id: "morning", label: "Sabah 09:00 - 12:00", startHour: 9, endHour: 12 },
  { id: "afternoon", label: "Öğleden sonra 12:00 - 17:00", startHour: 12, endHour: 17 },
  { id: "evening", label: "Akşam 17:00 - 21:00", startHour: 17, endHour: 21 },
];

export const MAX_SCHEDULE_DAYS = 7;

const DAY_NAMES = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

export function dayLabel(offset: number): string {
  if (offset === 0) return "Bugün";
  if (offset === 1) return "Yarın";
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return DAY_NAMES[d.getDay()];
}

export function dayShortDate(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}

/** Seçilen gün + zaman dilimi için randevu başlangıç zamanı. */
export function buildScheduledAt(dayOffset: number, slot: SlotId): Date {
  const conf = SCHEDULE_SLOTS.find((s) => s.id === slot) ?? SCHEDULE_SLOTS[0];
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(conf.startHour, 0, 0, 0);
  const min = new Date(Date.now() + 30 * 60 * 1000);
  return d < min ? min : d;
}

/** Bugün için zaman dilimi hâlâ seçilebilir mi? */
export function isSlotSelectable(dayOffset: number, slot: SlotId): boolean {
  if (dayOffset > 0) return true;
  const conf = SCHEDULE_SLOTS.find((s) => s.id === slot);
  if (!conf) return false;
  return new Date().getHours() < conf.endHour - 1;
}

export function formatScheduled(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((new Date(d).setHours(0, 0, 0, 0) - today.getTime()) / 86400000);
  const day = diffDays === 0 ? "Bugün" : diffDays === 1 ? "Yarın" : `${d.getDate()}.${d.getMonth() + 1}`;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${hh}:${mm}`;
}

/** Randevu saatine 3 saatten az kaldıysa çağrı "yaklaşan" sayılır. */
export function isScheduledSoon(value: string | null | undefined): boolean {
  if (!value) return false;
  const ms = new Date(value).getTime() - Date.now();
  return ms <= 3 * 60 * 60 * 1000;
}
