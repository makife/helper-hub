import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Star, CheckCircle, Phone, User, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

const Profile = () => {
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const requestLocation = () => {
    if (!("geolocation" in navigator) || !user) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const { error } = await supabase
          .from("profiles")
          .update({ latitude, longitude })
          .eq("user_id", user.id);

        setLocationLoading(false);

        if (error) {
          toast.error("Konum kaydedilemedi.");
          console.error(error);
          return;
        }

        setProfile((prev) => (prev ? { ...prev, latitude, longitude } : prev));
        toast.success("Konum güncellendi ✓");
      },
      () => {
        setLocationLoading(false);
        toast.error("Konum izni reddedildi");
      }
    );
  };

  const locationGranted = profile?.latitude != null && profile?.longitude != null;

  return (
    <div className="flex min-h-screen flex-col bg-background safe-top safe-bottom">
      <div className="flex items-center gap-3 px-5 pb-3 pt-4">
        <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-card shadow-card">
          <ArrowLeft size={20} className="text-foreground" />
        </button>
        <h1 className="text-xl font-black text-foreground">Profil</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="flex-1 px-5 pb-24">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-5 flex flex-col items-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={36} className="text-muted-foreground" />
              )}
            </div>
            <h2 className="mt-3 text-lg font-black text-foreground">
              {profile?.full_name || "İsimsiz Kullanıcı"}
            </h2>
            {profile?.phone && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Phone size={12} />
                <span>{profile.phone}</span>
              </div>
            )}
          </motion.div>

          <div className="mb-5 flex gap-3">
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <Star size={18} className="text-accent" />
              <p className="mt-1 text-lg font-black text-foreground">{profile?.rating || "0.0"}</p>
              <p className="text-[10px] text-muted-foreground">Puan</p>
            </div>
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <CheckCircle size={18} className="text-primary" />
              <p className="mt-1 text-lg font-black text-foreground">{profile?.total_completed || 0}</p>
              <p className="text-[10px] text-muted-foreground">Tamamlanan</p>
            </div>
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <span className="text-lg">💰</span>
              <p className="mt-1 text-lg font-black text-foreground">{profile?.credits || 0}</p>
              <p className="text-[10px] text-muted-foreground">Kredi</p>
            </div>
          </div>

          {profile?.bio && (
            <div className="mb-5 rounded-xl bg-card p-4 shadow-card">
              <p className="text-xs font-semibold text-muted-foreground">Hakkında</p>
              <p className="mt-1 text-sm text-foreground">{profile.bio}</p>
            </div>
          )}

          <button
            onClick={requestLocation}
            disabled={locationLoading}
            className={`mb-5 flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all active:scale-[0.98] disabled:opacity-60 ${locationGranted ? "border-success/30 bg-success/5" : "border-border bg-card"}`}
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${locationGranted ? "bg-success text-success-foreground" : "bg-primary/10 text-primary"}`}>
              <MapPin size={20} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">
                {locationLoading ? "Konum alınıyor..." : locationGranted ? "Konum aktif ✓" : "Konumunu aç"}
              </p>
              <p className="text-xs text-muted-foreground">
                {locationGranted ? "Yakınındaki işleri görebilirsin" : "Yakınındaki işleri görmek için gerekli"}
              </p>
            </div>
          </button>

          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3.5 text-sm font-bold text-destructive transition-all active:scale-[0.98]"
          >
            <LogOut size={16} />
            Çıkış Yap
          </button>
        </div>
      )}
    </div>
  );
};

export default Profile;
