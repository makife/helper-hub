import { translate } from "@/lib/i18n";
import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
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
      await Purchases.setLogLevel({ level: LOG_LEVEL.WARN });
      await Purchases.configure({ apiKey, appUserID: userId });
      configured = true;
    } else if (userId) {
      const { customerInfo } = await Purchases.getCustomerInfo();
      if (customerInfo.originalAppUserId !== userId) {
        await Purchases.logIn({ appUserID: userId });
      }
    }
    return true;
  } catch (e) {
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
  pkg: PurchasesPackage;
};

/** Mağazadan güncel kredi paketlerini (fiyatlarıyla) getirir */
export const fetchStorePacks = async (): Promise<StorePack[]> => {
  if (!isNativePlatform()) return [];
  const { current, all } = await Purchases.getOfferings();
  const offering = current ?? Object.values(all)[0];
  if (!offering) return [];

  return offering.availablePackages
    .map((pkg) => {
      const product = pkg.product as PurchasesStoreProduct;
      const productId = product.identifier.split(":")[0];
      return {
        productId,
        credits: PRODUCT_CREDITS[productId] ?? 0,
        priceString: product.priceString,
        pkg,
      };
    })
    .filter((p) => p.credits > 0)
    .sort((a, b) => a.credits - b.credits);
};

export type PurchaseOutcome =
  | { ok: true; productId: string; credits: number }
  | { ok: false; cancelled: boolean; message: string };

/** Satın alma akışı. Kredi yüklemesi RevenueCat webhook'u ile sunucu tarafında yapılır. */
export const purchaseStorePack = async (pack: StorePack): Promise<PurchaseOutcome> => {
  try {
    await Purchases.purchasePackage({ aPackage: pack.pkg });
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
