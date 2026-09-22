/**
 * Firebase Web yapılandırması (telefon doğrulama için).
 *
 * Değerler: Firebase Console > Proje ayarları > Uygulamalarınız > Web uygulaması
 * ("SDK kurulumu ve yapılandırması" kutusundaki firebaseConfig).
 *
 * Bu değerler gizli değildir, koda yazılabilir. Yalnızca apiKey ve appId
 * eksikse web tarafındaki telefon doğrulama devre dışı kalır; native (APK/iOS)
 * tarafı google-services.json / GoogleService-Info.plist dosyalarını kullanır,
 * buradaki değerlere ihtiyaç duymaz.
 */
export const FIREBASE_WEB_CONFIG = {
  apiKey: "",
  authDomain: "bielat-1c00a.firebaseapp.com",
  projectId: "bielat-1c00a",
  storageBucket: "bielat-1c00a.firebasestorage.app",
  messagingSenderId: "170480992927",
  appId: "",
};

export const FIREBASE_PROJECT_ID = FIREBASE_WEB_CONFIG.projectId;

export const isFirebaseWebConfigured = () =>
  !!FIREBASE_WEB_CONFIG.apiKey && !!FIREBASE_WEB_CONFIG.appId;
