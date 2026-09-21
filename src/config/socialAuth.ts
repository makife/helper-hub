/**
 * Google Cloud Console > Credentials > OAuth 2.0 Client IDs
 * "Web application" tipindeki istemcinin Client ID'si buraya yazılır.
 * (Client secret GEREKMEZ, bu değer herkese açıktır.)
 *
 * Android istemcisi ayrıca oluşturulmalı (paket adı: com.ergan.bielat + SHA-1),
 * ama koda yazılmaz; Google Play Services otomatik eşleştirir.
 */
export const GOOGLE_WEB_CLIENT_ID = "170480992927-jm8jia1hncqtckrs4c8dlql1iee1lfnv.apps.googleusercontent.com";

/** iOS istemcisi (GoogleService-Info.plist > CLIENT_ID). */
export const GOOGLE_IOS_CLIENT_ID = "170480992927-9536qsa2g1snclflt6jkfd1p5tr640et.apps.googleusercontent.com";

/**
 * iOS'ta Apple ile giriş native olarak çalışır; Services ID gerekmez.
 * (Sadece web/Android akışı için gerekir, şu an kullanılmıyor.)
 */
export const APPLE_CLIENT_ID = "com.ergan.bielat";
export const APPLE_REDIRECT_URL = "";
