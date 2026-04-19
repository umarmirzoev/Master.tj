import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Хук и провайдер авторизации хранят пользователя, роли, профиль и маршруты кабинетов.
type AppRole = Database["public"]["Enums"]["app_role"];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  roles: AppRole[];
  profile: { full_name: string; phone: string; avatar_url: string; approval_status?: string | null } | null;
  hasRole: (role: AppRole) => boolean;
  signOut: () => Promise<void>;
  refetchUserData: () => Promise<void>;
  mockLogin: (role: AppRole, email?: string) => void;
  getDashboardPath: () => string;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  roles: [],
  profile: null,
  hasRole: () => false,
  signOut: async () => {},
  refetchUserData: async () => {},
  mockLogin: () => {},
  getDashboardPath: () => "/dashboard",
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);

  // Загружаем роли и базовый профиль пользователя после входа.
  const fetchUserData = async (userId: string, userEmail?: string) => {
    const [rolesRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("profiles").select("full_name, phone, avatar_url, approval_status").eq("user_id", userId).single(),
    ]);
    
    let userRoles: AppRole[] = rolesRes.data ? rolesRes.data.map((r) => r.role) : [];
    
    // Developer bypass: If email is the superadmin email, force super_admin role
    if (userEmail === "superadmin@masterchas.tj" && !userRoles.includes("super_admin")) {
      userRoles.push("super_admin");
    }
    
    // Bypass for the user's requested admin email
    if (userEmail === "admin1@gmail.com" && !userRoles.includes("admin")) {
      userRoles.push("admin");
    }
    
    setRoles(userRoles);
    setProfile(profileRes.data ?? null);
  };

  // Подписываемся на смену сессии Supabase и синхронизируем локальное auth-состояние.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id, session.user.email), 0);
      } else {
        setRoles([]);
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id, session.user.email);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Подхватываем одобрение мастера без повторного входа в аккаунт.
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`auth-user-sync-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_roles", filter: `user_id=eq.${user.id}` },
        () => {
          void fetchUserData(user.id);
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        () => {
          void fetchUserData(user.id);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  const hasRole = (role: AppRole) => roles.includes(role);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRoles([]);
    setProfile(null);
  };

  const refetchUserData = async () => {
    if (user) await fetchUserData(user.id, user.email);
  };

  const mockLogin = (role: AppRole, email?: string) => {
    setRoles([role]);
    
    let full_name = "Пользователь";
    if (role === "master") full_name = "Демо мастер";
    if (role === "admin") full_name = "Администратор";
    if (role === "super_admin") full_name = "Супер Администратор";
    
    // Custom name for the requested user
    if (email === "umarmitzoev@gmail.com") {
      full_name = "Умар Мирзоев";
    }

    setProfile({
      full_name,
      phone: "+992 000 00 00",
      avatar_url: "",
      approval_status: role === "master" ? "approved" : "active",
    });
    setUser({
      id: email === "umarmitzoev@gmail.com" ? "00000000-0000-0000-0000-000000000001" : (role === "master" ? "00000000-0000-0000-0000-000000000002" : "00000000-0000-0000-0000-000000000003"),
      email: email || (role === "master" ? "master1@gmail.com" : "admin1@gmail.com"),
    } as any);
    setLoading(false);
  };

  const getDashboardPath = () => {
    if (roles.includes("super_admin")) return "/super-admin/dashboard";
    if (roles.includes("admin")) return "/admin/dashboard";
    if (roles.includes("master")) return "/master-dashboard";
    return "/dashboard";
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, roles, profile, hasRole, signOut, refetchUserData, mockLogin, getDashboardPath }}>
      {children}
    </AuthContext.Provider>
  );
}
