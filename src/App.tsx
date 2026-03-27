import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import PhoneLogin from "./pages/PhoneLogin";
import OTPVerify from "./pages/OTPVerify";
import RoleSelect from "./pages/RoleSelect";
import ProfileSetup from "./pages/ProfileSetup";
import Home from "./pages/Home";
import CreateTask from "./pages/CreateTask";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import MyTasks from "./pages/MyTasks";
import Profile from "./pages/Profile";
import UserProfile from "./pages/UserProfile";
import Messages from "./pages/Messages";
import ActiveTask from "./pages/ActiveTask";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <RoleProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/login" element={<PhoneLogin />} />
            <Route path="/otp" element={<OTPVerify />} />
            <Route path="/role-select" element={<RoleSelect />} />
            <Route path="/profile-setup" element={<ProfileSetup />} />
            <Route path="/home" element={<Home />} />
            <Route path="/create-task" element={<CreateTask />} />
            <Route path="/search" element={<Search />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/my-tasks" element={<MyTasks />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/:userId" element={<UserProfile />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/task/:taskId" element={<ActiveTask />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </RoleProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
