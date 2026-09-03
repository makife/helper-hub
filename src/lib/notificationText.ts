const TITLE_SUFFIXES = [
  "çağrını kabul etti",
  "cagrini kabul etti",
  "işi bıraktı",
  "isi birakti",
  "teklif gönderdi",
];

const AUTO_CANCEL_RE =
  /^Süre dolduğunda bir işlem yapmadığın için (.+) otomatik olarak iptal edildi\.$/;
const QUOTA_RE = /^(.+) kontenjan henüz dolmadı\.\s*(.+)$/;

/** Backend'den gelen (Türkçe kaydedilmiş) bildirim metnini aktif dile çevirir. */
export const localizeNotificationText = (
  text: string,
  t: (value: string, vars?: Record<string, string | number>) => string,
) => {
  if (!text) return text;

  for (const suffix of TITLE_SUFFIXES) {
    if (text.endsWith(` ${suffix}`)) {
      return `${text.slice(0, -suffix.length - 1)} ${t(suffix)}`;
    }
  }

  for (const sep of [" - ", " — ", " – "]) {
    const idx = text.indexOf(sep);
    if (idx > 0) {
      return `${t(text.slice(0, idx))}${sep}${t(text.slice(idx + sep.length))}`;
    }
  }

  const autoCancel = AUTO_CANCEL_RE.exec(text);
  if (autoCancel) {
    return t("Süre dolduğunda bir işlem yapmadığın için {title} otomatik olarak iptal edildi.", {
      title: t(autoCancel[1]),
    });
  }

  const quota = QUOTA_RE.exec(text);
  if (quota) {
    return `${t("{title} kontenjan henüz dolmadı.", { title: t(quota[1]) })} ${t(quota[2])}`;
  }

  return t(text);
};
