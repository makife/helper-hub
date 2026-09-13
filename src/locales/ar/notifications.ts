export const NOTIFICATIONS: Record<string, string> = {
  // Empty states
  "Bir iş kabul ettiğinizde mesajlaşma başlayacak.": "تبدأ المحادثة بعد قبول مهمة.",

  // Titles (with and without Turkish characters, as stored by the backend)
  "çağrını kabul etti": "قبل طلبك",
  "cagrini kabul etti": "قبل طلبك",
  "işi bıraktı": "ترك المهمة",
  "isi birakti": "ترك المهمة",
  "Is tamamlandi": "تم إنجاز المهمة",
  "İş tamamlandı": "تم إنجاز المهمة",
  "Is bitti olarak isaretlendi": "تم تحديد المهمة كمنتهية",
  "İş bitti olarak işaretlendi": "تم تحديد المهمة كمنتهية",
  "Is tamamlanmadi olarak isaretlendi": "تم تحديد المهمة كغير منجزة",
  "İş tamamlanmadı olarak işaretlendi": "تم تحديد المهمة كغير منجزة",
  "Yardim cagrinin suresi doldu": "انتهت مدة طلب المساعدة",
  "Yardım çağrının süresi doldu": "انتهت مدة طلب المساعدة",
  "Yardım çağrısı iptal edildi": "تم إلغاء طلب المساعدة",
  "Çağrınız otomatik iptal edildi": "تم إلغاء طلبك تلقائيًا",
  "İşi başlatmaya 5 dk kaldı": "بقيت 5 دقائق لبدء المهمة",

  // Bodies
  "24 saat icinde onaylamazsan otomatik tamamlanacak":
    "سيتم الإنجاز تلقائيًا إذا لم تؤكد خلال 24 ساعة",
  "24 saat içinde onaylamazsan otomatik tamamlanacak":
    "سيتم الإنجاز تلقائيًا إذا لم تؤكد خلال 24 ساعة",
  "degerlendirme yap": "اكتب تقييمًا",
  "değerlendirme yap": "اكتب تقييمًا",
  "is veren itiraz etti. Tamamlayip tekrar bildirebilirsin.":
    "اعترض صاحب الطلب. يمكنك إنجاز المهمة والإبلاغ مرة أخرى.",
  "iş veren itiraz etti. Tamamlayıp tekrar bildirebilirsin.":
    "اعترض صاحب الطلب. يمكنك إنجاز المهمة والإبلاغ مرة أخرى.",
  "kimse el atmadi, cagri kapatildi": "لم يتقدم أحد، وتم إغلاق الطلب",
  "kimse el atmadı, çağrı kapatıldı": "لم يتقدم أحد، وتم إغلاق الطلب",
  "kimse el atmadi, kredin iade edildi": "لم يتقدم أحد، وتم إرجاع رصيدك",
  "kimse el atmadı, kredin iade edildi": "لم يتقدم أحد، وتم إرجاع رصيدك",
  "çağrı yapan işi başlatmadığı için iş iptal oldu.":
    "تم إلغاء المهمة لأن صاحب الطلب لم يبدأها.",
  "Süre dolduğunda bir işlem yapmadığın için {title} otomatik olarak iptal edildi.":
    "تم إلغاء {title} تلقائيًا لأنك لم تتخذ أي إجراء قبل انتهاء المدة.",
  "{title} kontenjan henüz dolmadı.": "لم يكتمل العدد المطلوب في {title} بعد.",
  "5 dakika içinde vazgeçebilir veya mevcut kişilerle başlatabilirsin.":
    "يمكنك الإلغاء خلال 5 دقائق أو البدء بالأشخاص الموجودين حاليًا.",

  // No-show / suspension
  "Randevu saatin yaklasiyor": "موعدك يقترب",
  "Randevu saatin yaklaşıyor": "موعدك يقترب",
  "Zamaninda gitmezsen cagri iptal edilir ve hesabin 1 ay askiya alinir.":
    "إذا لم تحضر في الوقت المحدد، سيتم إلغاء الطلب وتعليق حسابك لمدة شهر.",
  "Randevu saatin gecti": "انتهى وقت موعدك",
  "Randevu saatin geçti": "انتهى وقت موعدك",
  "1 saat icinde varis kaydetmezsen cagri iptal edilir ve hesabin 1 ay askiya alinir.":
    "إذا لم تسجّل وصولك خلال ساعة، سيتم إلغاء الطلب وتعليق حسابك لمدة شهر.",
  "Hesabin 1 ay askiya alindi": "تم تعليق حسابك لمدة شهر",
  "Randevu saatinden 1 saat sonra varis kaydetmedigin icin cagri iptal edildi.":
    "تم إلغاء الطلب لأنك لم تسجّل وصولك خلال ساعة من وقت الموعد.",
  "Cagrin otomatik iptal edildi": "تم إلغاء طلبك تلقائيًا",
  "El atan randevuya gelmedi. 1 kredin iade edildi.":
    "لم يحضر المساعد إلى الموعد. تم إرجاع رصيد واحد إليك.",
  "Varış kaydetmezsen iş iptal edilir ve hesabın 1 ay askıya alınır.":
    "إذا لم تسجّل وصولك، سيتم إلغاء المهمة وتعليق حسابك لمدة شهر.",
  "Randevu saatin geçti. {time} içinde varış kaydetmezsen iş iptal edilir ve hesabın 1 ay askıya alınır.":
    "انتهى وقت موعدك. إذا لم تسجّل وصولك خلال {time}، سيتم إلغاء المهمة وتعليق حسابك لمدة شهر.",
  "Randevu saatini kaçırdın. İş iptal ediliyor.": "لقد فوّت الموعد. جارٍ إلغاء المهمة.",
  "Randevuna {time} kaldı. Zamanında gitmezsen hesabın 1 ay askıya alınır.":
    "بقي {time} حتى موعدك. إذا لم تحضر في الوقت المحدد، سيتم تعليق حسابك لمدة شهر.",
  "Hesabın askıya alındı": "تم تعليق حسابك",
  "Kabul ettiğin bir işin randevusuna gitmediğin için hesabın {date} tarihine kadar askıda.":
    "حسابك معلّق حتى {date} لأنك لم تحضر موعد مهمة قبلتها.",
  "Hesabın yönetici tarafından askıya alındı.": "تم تعليق حسابك من قِبل المسؤول.",
  "Onay suren doldu": "انتهت مدة التأكيد",
  "El atan zamaninda onaylamadi": "لم يؤكد المساعد في الوقت المحدد",
};
