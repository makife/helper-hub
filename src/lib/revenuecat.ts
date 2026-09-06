import { translate } from "@/lib/i18n";
import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
  PRODUCT_CATEGORY,
  type PurchasesPackage,
  type PurchasesStoreProduct,
} from "@revenuecat/purchases-capacitor";

/**
 * RevenueCat public SDK keys (bunlar gizli değildir, istemcide bulunmaları normaldir).
 * RevenueCat → Project Settings → API keys ekranından alınır.
 */
export const REVENUECAT_KEYS = {
  ios: "appl_LkUWptnaBNRBvxaaIGCFZvfKDrr",
  android: "goog_pEDsXcVoklDKmEkABsxQawbCgoW",
};

/** RevenueCat ürün kimliği → yüklenecek kredi (bonus dahil) */
export const PRODUCT_CREDITS: Record<string, number> = {
  credits_5: 5,
  credits_15: 17,
  credits_40: 48,
  credits_100: 125,
};

export const isNativePlatform = () => Capacitor.isNativePlatform();

let configured = false;
let configurePromise: Promise<boolean> | null = null;

/** Uygulama açılışında ve kullanıcı giriş yaptığında çağrılır */
export const initRevenueCat = async (userId?: string) => {
  if (!isNativePlatform()) return false;

  const platform = Capacitor.getPlatform();
  const apiKey = platform === "ios" ? REVENUECAT_KEYS.ios : REVENUECAT_KEYS.android;
  if (!apiKey) {
    console.warn("RevenueCat API anahtarı tanımlı değil.");
    return false;
  }

  try {
    if (!configured) {
      configurePromise ??= (async () => {
        await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
        await Purchases.configure({ apiKey, appUserID: userId });
        configured = true;
        return true;
      })();
      await configurePromise;
    } else if (userId) {
      const { appUserID } = await Purchases.getAppUserID();
      if (appUserID !== userId) {
        await Purchases.logIn({ appUserID: userId });
      }
    }
    return true;
  } catch (e) {
    configurePromise = null;
    console.error("RevenueCat init hatası", e);
    return false;
  }
};

export const logOutRevenueCat = async () => {
  if (!isNativePlatform() || !configured) return;
  try {
    await Purchases.logOut();
  } catch {
    /* anonim kullanıcıda hata verir, yok sayılır */
  }
};

export type StorePack = {
  productId: string;
  credits: number;
  priceString: string;
  pkg?: PurchasesPackage;
  product: PurchasesStoreProduct;
};

/** Mağazadan güncel kredi paketlerini (fiyatlarıyla) getirir */
export type StoreFetchResult = {
  packs: StorePack[];
  /** Teknik hata/durum bilgisi (kullanıcıya gösterilmez, log/teşhis içindir) */
  diagnostic?: string;
};

const mapProduct = (product: PurchasesStoreProduct, pkg?: PurchasesPackage): StorePack => {
  const productId = product.identifier.split(":")[0];
  return {
    productId,
    credits: PRODUCT_CREDITS[productId] ?? 0,
    priceString: product.priceString,
    pkg,
    product,
  };
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const fetchStorePacks = async (): Promise<StoreFetchResult> => {
  if (!isNativePlatform()) return { packs: [], diagnostic: "not_native" };

  const notes: string[] = [];

  // Mağaza bağlantısı (Play Billing) hazır olana kadar birkaç kez dene.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(1200 * attempt);

    // 1) Offerings
    try {
      const { current, all } = await Purchases.getOfferings();
      const offering = current ?? Object.values(all ?? {})[0];
      const packs = (offering?.availablePackages ?? [])
        .map((pkg) => mapProduct(pkg.product, pkg))
        .filter((p) => p.credits > 0);
      if (packs.length > 0) return { packs: packs.sort((a, b) => a.credits - b.credits) };
      notes.push(`offerings_empty(current=${current?.identifier ?? "none"})`);
    } catch (e) {
      notes.push(`offerings_error:${(e as Error)?.message ?? e}`);
    }

    // 2) Doğrudan ürün sorgusu (tek seferlik ürünler)
    try {
      const { products } = await Purchases.getProducts({
        productIdentifiers: Object.keys(PRODUCT_CREDITS),
        type: PRODUCT_CATEGORY.NON_SUBSCRIPTION,
      });
      const packs = (products ?? []).map((p) => mapProduct(p)).filter((p) => p.credits > 0);
      if (packs.length > 0) return { packs: packs.sort((a, b) => a.credits - b.credits) };
      notes.push("products_empty");
    } catch (e) {
      notes.push(`products_error:${(e as Error)?.message ?? e}`);
    }

    // 3) Kategori belirtmeden son bir deneme (bazı sürümlerde type filtresi ürünleri gizliyor)
    try {
      const { products } = await Purchases.getProducts({
        productIdentifiers: Object.keys(PRODUCT_CREDITS),
      });
      const packs = (products ?? []).map((p) => mapProduct(p)).filter((p) => p.credits > 0);
      if (packs.length > 0) return { packs: packs.sort((a, b) => a.credits - b.credits) };
      notes.push("products_untyped_empty");
    } catch (e) {
      notes.push(`products_untyped_error:${(e as Error)?.message ?? e}`);
    }
  }

  return { packs: [], diagnostic: notes.join(" | ") };
};


export type PurchaseOutcome =
  | { ok: true; productId: string; credits: number }
  | { ok: false; cancelled: boolean; message: string };

/** Satın alma akışı. Kredi yüklemesi RevenueCat webhook'u ile sunucu tarafında yapılır. */
export const purchaseStorePack = async (pack: StorePack): Promise<PurchaseOutcome> => {
  try {
    if (pack.pkg) {
      await Purchases.purchasePackage({ aPackage: pack.pkg });
    } else {
      await Purchases.purchaseStoreProduct({ product: pack.product });
    }
    return { ok: true, productId: pack.productId, credits: pack.credits };
  } catch (e) {
    const err = e as { code?: string; message?: string; userCancelled?: boolean };
    const cancelled = Boolean(err.userCancelled) || err.code === "1";
    return {
      ok: false,
      cancelled,
      message: cancelled ? translate("Satın alma iptal edildi.") : translate("Satın alma tamamlanamadı."),
    };
  }
};

/** Kullanıcının geçmiş satın almalarını mağazadan geri yükler */
export const restorePurchases = async () => {
  if (!isNativePlatform()) return false;
  try {
    await Purchases.restorePurchases();
    return true;
  } catch {
    return false;
  }
};
