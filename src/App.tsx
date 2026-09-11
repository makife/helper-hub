import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, ReactNode } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobalNotifier from "@/components/GlobalNotifier";
import SuspensionGate from "@/components/SuspensionGate";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { safeSession } from "@/lib/safeStorage";
import { I18nProvider } from "@/lib/i18n";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import InviteLanding from "./pages/InviteLanding";
import { setupNativeAuthListener } from "@/lib/nativeAuth";
import { enablePrivacyScreen } from "@/lib/privacyScreen";
import ProfileSetup from "./pages/ProfileSetup";
import Home from "./pages/Home";
import CreateTask from "./pages/CreateTask";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import MyTasks from "./pages/MyTasks";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Market from "./pages/Market";
import Messages from "./pages/Messages";
import ActiveTask from "./pages/ActiveTask";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import AdminReports from "./pages/AdminReports";
import AdminVerifications from "./pages/AdminVerifications";

const queryClient = new QueryClient();

// Native OAuth deep-link geri dönüşünü yakalar (com.ergan.bielat://auth/callback)
setupNativeAuthListener();
enablePrivacyScreen();

const RouteLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

/**
 * Korumalı sayfa kapısı:
 * - Giriş yapmamış kullanıcıyı karşılama ekranına yollar.
 * - requireProfile=true ise profilini (ad + 18+ onayı) tamamlamamış
 *   kullanıcıyı profil kurulumuna yollar; harita/işler görünmez.
 */
const RequireAuth = ({ children, requireProfile = true }: { children: ReactNode; requireProfile?: boolean }) => {
  const { user, loading } = useAuth();
  const [profileOk, setProfileOk] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !requireProfile) return;
    let cancelled = false;
    const completionKey = `profile-completed:${user.id}`;
    if (safeSession.get(completionKey) === "true") {
      setProfileOk(true);
      return;
    }
    supabase
      .from("profiles")
      .select("full_name, age_confirmed_at")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const complete = !!(data?.full_name?.trim() && data?.age_confirmed_at);
        if (complete) safeSession.set(completionKey, "true");
        setProfileOk(complete);
      }, (err: unknown) => {
        // Ağ/izin hatasında uygulama hata ekranına düşmesin; kurulum sayfasına yollansın.
        console.error("Profil kontrolü yapılamadı:", err);
        if (!cancelled) setProfileOk(false);
      });
    return () => { cancelled = true; };
  }, [user, requireProfile]);


  if (loading) return <RouteLoader />;
  if (!user) return <Navigate to="/" replace />;
  if (requireProfile) {
    if (profileOk === null) return <RouteLoader />;
    if (!profileOk) return <Navigate to="/profile-setup" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <GlobalNotifier />
              <SuspensionGate />

              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/davet/:code" element={<InviteLanding />} />
                <Route path="/profile-setup" element={<RequireAuth requireProfile={false}><ProfileSetup /></RequireAuth>} />
                <Route path="/home" element={<RequireAuth><Home /></RequireAuth>} />
                <Route path="/create-task" element={<RequireAuth><CreateTask /></RequireAuth>} />
                <Route path="/search" element={<RequireAuth><Search /></RequireAuth>} />
                <Route path="/notifications" element={<RequireAuth><Notifications /></RequireAuth>} />
                <Route path="/my-tasks" element={<RequireAuth><MyTasks /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/profile/:userId" element={<RequireAuth><UserProfile /></RequireAuth>} />
                <Route path="/market" element={<RequireAuth><Market /></RequireAuth>} />
                <Route path="/messages" element={<RequireAuth><Messages /></RequireAuth>} />
                <Route path="/task/:taskId" element={<RequireAuth><ActiveTask /></RequireAuth>} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/admin/reports" element={<RequireAuth><AdminReports /></RequireAuth>} />
                <Route path="/admin/verifications" element={<RequireAuth><AdminVerifications /></RequireAuth>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
