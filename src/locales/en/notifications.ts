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

  // No-show / suspension
  "Randevu saatin yaklasiyor": "Your appointment time is approaching",
  "Randevu saatin yaklaşıyor": "Your appointment time is approaching",
  "Zamaninda gitmezsen cagri iptal edilir ve hesabin 1 ay askiya alinir.":
    "If you do not show up on time, the request is cancelled and your account is suspended for 1 month.",
  "Randevu saatin gecti": "Your appointment time has passed",
  "Randevu saatin geçti": "Your appointment time has passed",
  "1 saat icinde varis kaydetmezsen cagri iptal edilir ve hesabin 1 ay askiya alinir.":
    "If you do not check in within 1 hour, the request is cancelled and your account is suspended for 1 month.",
  "Hesabin 1 ay askiya alindi": "Your account is suspended for 1 month",
  "Randevu saatinden 1 saat sonra varis kaydetmedigin icin cagri iptal edildi.":
    "The request was cancelled because you did not check in within 1 hour of the appointment time.",
  "Cagrin otomatik iptal edildi": "Your request was cancelled automatically",
  "El atan randevuya gelmedi. 1 kredin iade edildi.":
    "The helper did not show up. 1 credit was refunded to you.",
  "Varış kaydetmezsen iş iptal edilir ve hesabın 1 ay askıya alınır.":
    "If you do not check in, the task is cancelled and your account is suspended for 1 month.",
  "Randevu saatin geçti. {time} içinde varış kaydetmezsen iş iptal edilir ve hesabın 1 ay askıya alınır.":
    "Your appointment time has passed. If you do not check in within {time}, the task is cancelled and your account is suspended for 1 month.",
  "Randevu saatini kaçırdın. İş iptal ediliyor.": "You missed the appointment. The task is being cancelled.",
  "Randevuna {time} kaldı. Zamanında gitmezsen hesabın 1 ay askıya alınır.":
    "{time} left until your appointment. If you are not there on time, your account is suspended for 1 month.",
  "Hesabın askıya alındı": "Your account is suspended",
  "Kabul ettiğin bir işin randevusuna gitmediğin için hesabın {date} tarihine kadar askıda.":
    "Your account is suspended until {date} because you did not show up for a task you accepted.",
  "Hesabın yönetici tarafından askıya alındı.": "Your account was suspended by an administrator.",
};
