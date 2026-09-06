import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { initRevenueCat, logOutRevenueCat } from "@/lib/revenuecat";
import { initializePushNotifications, unregisterPushNotifications } from "@/lib/pushNotifications";


type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Supabase auth callback'i içinde başka Supabase/plugin çağrısı yapmak
        // native WebView'de kilitlenmeye yol açıyor: bir sonraki tick'e erteliyoruz.
        const uid = session?.user?.id ?? null;
        setTimeout(() => {
          if (uid) {
            void initRevenueCat(uid).catch((e) => console.error("RevenueCat init:", e));
            void initializePushNotifications(uid).catch((e) => console.error("Push init:", e));
          } else {
            void unregisterPushNotifications().catch(() => {});
          }
        }, 0);
      }
    );


    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          void initRevenueCat(session.user.id).catch((e) => console.error("RevenueCat init:", e));
          void initializePushNotifications(session.user.id).catch((e) => console.error("Push init:", e));
        }
      })
      .catch((e) => {
        // Oturum okunamazsa uygulama sonsuz yüklenmede kalmasın.
        console.error("Oturum alınamadı:", e);
        setLoading(false);
      });


    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await unregisterPushNotifications();
    await logOutRevenueCat();
    await supabase.auth.signOut();
  };


  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
