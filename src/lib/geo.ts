import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

/**
 * Native (Android/iOS) WebView'de navigator.geolocation izin isteyemez ve
 * sürekli "izin reddedildi" döner. Bu yüzden native platformlarda
 * navigator.geolocation'ı Capacitor Geolocation eklentisiyle değiştiriyoruz.
 * Böylece uygulama içindeki tüm mevcut kodlar (getCurrentPosition/watchPosition)
 * gerçek sistem izin diyalogunu tetikler ve Android ayarlarında izin görünür.
 */

const toPosition = (p: {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number | null;
    altitudeAccuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
  };
}): GeolocationPosition =>
  ({
    timestamp: p.timestamp,
    coords: {
      latitude: p.coords.latitude,
      longitude: p.coords.longitude,
      accuracy: p.coords.accuracy,
      altitude: p.coords.altitude ?? null,
      altitudeAccuracy: p.coords.altitudeAccuracy ?? null,
      heading: p.coords.heading ?? null,
      speed: p.coords.speed ?? null,
    },
  }) as unknown as GeolocationPosition;

const toError = (e: unknown): GeolocationPositionError => {
  const message = e instanceof Error ? e.message : String(e);
  const denied = /denied|permission/i.test(message);
  return {
    code: denied ? 1 : 2,
    message,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  } as GeolocationPositionError;
};

/** Sistem konum iznini ister; izin durumunu döner. */
export const ensureLocationPermission = async (): Promise<"granted" | "denied"> => {
  if (!Capacitor.isNativePlatform()) return "granted";
  try {
    let status = await Geolocation.checkPermissions();
    if (status.location !== "granted" && status.coarseLocation !== "granted") {
      status = await Geolocation.requestPermissions({ permissions: ["location", "coarseLocation"] });
    }
    return status.location === "granted" || status.coarseLocation === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
};

export const installNativeGeolocation = () => {
  if (!Capacitor.isNativePlatform()) return;

  const watchIds = new Map<number, string>();
  let nextId = 1;

  const patched = {
    getCurrentPosition: (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
      options?: PositionOptions,
    ) => {
      void (async () => {
        try {
          if ((await ensureLocationPermission()) !== "granted") {
            throw new Error("User denied Geolocation");
          }
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: options?.enableHighAccuracy ?? true,
            timeout: options?.timeout ?? 15000,
            maximumAge: options?.maximumAge ?? 0,
          });
          success(toPosition(pos));
        } catch (e) {
          error?.(toError(e));
        }
      })();
    },
    watchPosition: (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
      options?: PositionOptions,
    ): number => {
      const id = nextId++;
      void (async () => {
        try {
          if ((await ensureLocationPermission()) !== "granted") {
            throw new Error("User denied Geolocation");
          }
          const wid = await Geolocation.watchPosition(
            {
              enableHighAccuracy: options?.enableHighAccuracy ?? true,
              timeout: options?.timeout ?? 30000,
              maximumAge: options?.maximumAge ?? 0,
            },
            (pos, err) => {
              if (err || !pos) {
                error?.(toError(err ?? new Error("Konum alınamadı")));
                return;
              }
              success(toPosition(pos));
            },
          );
          if (watchIds.has(id)) {
            // arada clearWatch çağrıldıysa hemen durdur
            void Geolocation.clearWatch({ id: wid });
            watchIds.delete(id);
          } else {
            watchIds.set(id, wid);
          }
        } catch (e) {
          error?.(toError(e));
        }
      })();
      return id;
    },
    clearWatch: (id: number) => {
      const wid = watchIds.get(id);
      if (wid) {
        watchIds.delete(id);
        void Geolocation.clearWatch({ id: wid });
      } else {
        // henüz kaydolmadıysa iptal işareti bırak
        watchIds.set(id, "");
      }
    },
  };

  try {
    Object.defineProperty(navigator, "geolocation", {
      value: patched,
      configurable: true,
    });
  } catch {
    /* yoksay */
  }
};
