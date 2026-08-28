import { useEffect } from "react";
import logo from "@/assets/logo.png";

/**
 * Native OAuth köprü sayfası.
 * Yayınlanan site üzerinde çalışır: OAuth broker giriş tamamlanınca buraya
 * token'larla yönlendirir, bu sayfa da token'ları koruyarak kullanıcıyı
 * com.ergan.bielat:// deep-link'i ile native uygulamaya geri gönderir.
 */
const AuthCallback = () => {
  useEffect(() => {
    const target = `com.ergan.bielat://auth/callback${window.location.search}${window.location.hash}`;
    // Custom scheme yönlendirmesi Android/iOS'ta uygulamayı açar
    window.location.replace(target);
  }, []);

  const openApp = () => {
    window.location.href = `com.ergan.bielat://auth/callback${window.location.search}${window.location.hash}`;
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center">
      <img src={logo} alt="Bi' El At" width={72} height={72} />
      <div>
        <h1 className="text-2xl font-black text-foreground">Giriş tamamlandı</h1>
        <p className="mt-2 text-base text-muted-foreground">
          Uygulamaya yönlendiriliyorsunuz...
        </p>
      </div>
      <button
        onClick={openApp}
        className="rounded-2xl bg-primary px-8 py-4 text-lg font-bold text-primary-foreground"
      >
        Uygulamaya dön
      </button>
    </div>
  );
};

export default AuthCallback;
