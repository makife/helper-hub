/**
 * Aynı isimli realtime kanalına ikinci kez abone olmak native WebView'de
 * (Android) uygulamayı çökertebiliyor. Aynı hook/bileşen ekranda birden
 * fazla kez kullanıldığında bu durum oluşuyor. Bu yüzden her abonelik
 * benzersiz bir kanal adı almalı.
 */
let sequence = 0;

export const uniqueChannel = (base: string) => `${base}-${++sequence}`;
