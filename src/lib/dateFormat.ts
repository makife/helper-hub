const months = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

export const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hour = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  const datePart = isThisYear ? `${day} ${month}` : `${day} ${month} ${year}`;
  return `${datePart}, ${hour}:${min}`;
};

export const formatDate = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const now = new Date();
  const isThisYear = d.getFullYear() === now.getFullYear();
  return isThisYear ? `${day} ${month}` : `${day} ${month} ${year}`;
};

export const timeAgo = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "şimdi";
  if (mins < 60) return `${mins} dk`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} sa`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gün`;
  return formatDate(date);
};
