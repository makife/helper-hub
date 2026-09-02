export const NOTIFICATIONS: Record<string, string> = {
  // Empty states
  "Bir iş kabul ettiğinizde mesajlaşma başlayacak.": "Chat starts once a task is accepted.",

  // Titles (with and without Turkish characters, as stored by the backend)
  "çağrını kabul etti": "accepted your request",
  "cagrini kabul etti": "accepted your request",
  "işi bıraktı": "left the task",
  "isi birakti": "left the task",
  "Is tamamlandi": "Task completed",
  "İş tamamlandı": "Task completed",
  "Is bitti olarak isaretlendi": "Marked as finished",
  "İş bitti olarak işaretlendi": "Marked as finished",
  "Is tamamlanmadi olarak isaretlendi": "Marked as not completed",
  "İş tamamlanmadı olarak işaretlendi": "Marked as not completed",
  "Yardim cagrinin suresi doldu": "Your help request expired",
  "Yardım çağrının süresi doldu": "Your help request expired",
  "Yardım çağrısı iptal edildi": "Help request cancelled",
  "Çağrınız otomatik iptal edildi": "Your request was cancelled automatically",
  "İşi başlatmaya 5 dk kaldı": "5 minutes left to start the task",

  // Bodies
  "24 saat icinde onaylamazsan otomatik tamamlanacak":
    "It will be completed automatically if you do not confirm within 24 hours",
  "24 saat içinde onaylamazsan otomatik tamamlanacak":
    "It will be completed automatically if you do not confirm within 24 hours",
  "degerlendirme yap": "leave a review",
  "değerlendirme yap": "leave a review",
  "is veren itiraz etti. Tamamlayip tekrar bildirebilirsin.":
    "the requester objected. You can complete it and report again.",
  "iş veren itiraz etti. Tamamlayıp tekrar bildirebilirsin.":
    "the requester objected. You can complete it and report again.",
  "kimse el atmadi, cagri kapatildi": "nobody applied, the request was closed",
  "kimse el atmadı, çağrı kapatıldı": "nobody applied, the request was closed",
  "kimse el atmadi, kredin iade edildi": "nobody applied, your credit was refunded",
  "kimse el atmadı, kredin iade edildi": "nobody applied, your credit was refunded",
  "çağrı yapan işi başlatmadığı için iş iptal oldu.":
    "the task was cancelled because the requester never started it.",
  "Süre dolduğunda bir işlem yapmadığın için {title} otomatik olarak iptal edildi.":
    "{title} was cancelled automatically because you took no action before the deadline.",
  "{title} kontenjan henüz dolmadı.": "{title} has not reached its required headcount yet.",
  "5 dakika içinde vazgeçebilir veya mevcut kişilerle başlatabilirsin.":
    "You can cancel within 5 minutes or start with the people you already have.",
};
