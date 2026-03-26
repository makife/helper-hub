import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, CheckCircle, Phone, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const UserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [userId]);

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
      ) : !profile ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-muted-foreground">Kullanıcı bulunamadı</p>
        </div>
      ) : (
        <div className="flex-1 px-5 pb-24">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-5 flex flex-col items-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                <User size={36} className="text-muted-foreground" />
              )}
            </div>
            <h2 className="mt-3 text-lg font-black text-foreground">
              {profile.full_name || "İsimsiz Kullanıcı"}
            </h2>
            {profile.phone && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <Phone size={12} />
                <span>{profile.phone}</span>
              </div>
            )}
          </motion.div>

          <div className="mb-5 flex gap-3">
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <Star size={18} className="text-accent" />
              <p className="mt-1 text-lg font-black text-foreground">{profile.rating || "0.0"}</p>
              <p className="text-[10px] text-muted-foreground">Puan</p>
            </div>
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <CheckCircle size={18} className="text-primary" />
              <p className="mt-1 text-lg font-black text-foreground">{profile.total_completed || 0}</p>
              <p className="text-[10px] text-muted-foreground">Tamamlanan</p>
            </div>
            <div className="flex flex-1 flex-col items-center rounded-xl bg-card p-3 shadow-card">
              <span className="text-lg">💰</span>
              <p className="mt-1 text-lg font-black text-foreground">{profile.credits || 0}</p>
              <p className="text-[10px] text-muted-foreground">Kredi</p>
            </div>
          </div>

          {profile.bio && (
            <div className="mb-5 rounded-xl bg-card p-4 shadow-card">
              <p className="text-xs font-semibold text-muted-foreground">Hakkında</p>
              <p className="mt-1 text-sm text-foreground">{profile.bio}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserProfile;
