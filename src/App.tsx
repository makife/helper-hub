import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import GlobalNotifier from "@/components/GlobalNotifier";
import { AuthProvider } from "@/contexts/AuthContext";
import { I18nProvider } from "@/lib/i18n";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import InviteLanding from "./pages/InviteLanding";
import { setupNativeAuthListener } from "@/lib/nativeAuth";
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

const queryClient = new QueryClient();

// Native OAuth deep-link geri dönüşünü yakalar (com.ergan.bielat://auth/callback)
setupNativeAuthListener();

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
              <Routes>
                <Route path="/" element={<Welcome />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/login" element={<Login />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/davet/:code" element={<InviteLanding />} />
                <Route path="/profile-setup" element={<ProfileSetup />} />
                <Route path="/home" element={<Home />} />
                <Route path="/create-task" element={<CreateTask />} />
                <Route path="/search" element={<Search />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/my-tasks" element={<MyTasks />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/profile/:userId" element={<UserProfile />} />
                <Route path="/market" element={<Market />} />
                <Route path="/messages" element={<Messages />} />
                <Route path="/task/:taskId" element={<ActiveTask />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/admin/reports" element={<AdminReports />} />
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
