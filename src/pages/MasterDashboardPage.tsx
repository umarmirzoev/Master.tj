import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import MasterDashboard from "@/components/dashboard/MasterDashboard";

// Страница-обёртка для кабинета мастера с защитой по роли.
const MasterDashboardPage = () => {
  const { user, loading, hasRole, profile } = useAuth();
  const navigate = useNavigate();

  // Проверяем авторизацию и роль мастера, чтобы защитить служебную страницу.
  useEffect(() => {
    if (!loading && !user) navigate("/auth");
    if (!loading && user && !hasRole("master")) navigate("/dashboard");
    if (!loading && user && hasRole("master") && profile?.approval_status === "pending") {
      navigate("/pending-approval", { replace: true });
    }
  }, [user, loading, hasRole, navigate, profile?.approval_status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !hasRole("master") || profile?.approval_status === "pending") return null;

  return <MasterDashboard />;
};

export default MasterDashboardPage;
