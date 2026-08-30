// Haritada gösterilen görev pinleri için gizlilik amaçlı konum bulanıklaştırma.
// Gerçek konum yerine, göreve özgü sabit (deterministic) bir ofsetle kaydırılmış
// nokta gösterilir. Böylece kullanıcı işi kabul etmeden tam konumu göremez,
// ama pin sayfa yenilense/yeniden render olsa bile hep aynı yerde durur.

// Basit string -> sayı hash (seed üretimi için)
const hashStringToSeed = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
};

// Seed'e bağlı, tekrarlanabilir pseudo-random üretici (mulberry32)
const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Verilen konumu, seed'e göre sabit kalacak şekilde 0-radiusMeters arasında
 * rastgele bir yöne ve mesafeye kaydırır. Aynı seed her zaman aynı sonucu üretir.
 */
export const getFuzzedLocation = (
  lat: number,
  lng: number,
  seed: string,
  radiusMeters = 500
): { lat: number; lng: number } => {
  const rand = mulberry32(hashStringToSeed(seed));

  const angle = rand() * 2 * Math.PI;
  // Alan içinde eşit dağılım için sqrt kullanılır (merkeze yığılmayı önler)
  const distance = Math.sqrt(rand()) * radiusMeters;

  const dLat = (distance * Math.cos(angle)) / 111_320;
  const dLng =
    (distance * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));

  return { lat: lat + dLat, lng: lng + dLng };
};
