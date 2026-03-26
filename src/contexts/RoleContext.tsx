import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type RoleContextType = {
  role: "owner" | "tasker";
  isRoleLoading: boolean;
  toggleRole: () => Promise<void>;
};

const RoleContext = createContext<RoleContextType>({
  role: "owner",
  isRoleLoading: true,
  toggleRole: async () => {},
});

export const useRole = () => useContext(RoleContext);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [role, setRole] = useState<"owner" | "tasker">("owner");
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsRoleLoading(false);
      return;
    }
    supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.role) setRole(data.role);
        setIsRoleLoading(false);
      });
  }, [user]);

  const toggleRole = async () => {
    if (!user) return;
    const newRole = role === "owner" ? "tasker" : "owner";
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", user.id);
    if (!error) setRole(newRole);
  };

  return (
    <RoleContext.Provider value={{ role, isRoleLoading, toggleRole }}>
      {children}
    </RoleContext.Provider>
  );
};
