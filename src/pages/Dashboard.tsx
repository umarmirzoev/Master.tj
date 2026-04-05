import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ClientDashboard from "@/components/dashboard/ClientDashboard";

// Страница кабинета клиента проверяет роль пользователя и направляет его в нужный кабинет.
const Dashboard = () => {
  const { user, loading, hasRole, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [checkingApproval, setCheckingApproval] = useState(true);

  // Неавторизованный пользователь не должен попадать в кабинет.
  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  // Redirect role-specific users to their dedicated routes
  useEffect(() => {
    if (loading || !user) return;
    if (hasRole("super_admin")) {
      navigate("/super-admin/dashboard", { replace: true });
      return;
    }
    if (hasRole("admin")) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    if (hasRole("master")) {
      navigate("/master-dashboard", { replace: true });
      return;
    }
  }, [user, loading, hasRole, navigate]);

  // Check approval status for masters
  useEffect(() => {
    const check = async () => {
      if (!user) return;
      if (hasRole("master")) {
        const { data } = await supabase.from("profiles").select("approval_status").eq("user_id", user.id).single();
        setApprovalStatus(data?.approval_status || "active");
      } else {
        setApprovalStatus("active");
      }
      setCheckingApproval(false);
    };
    if (user && !loading) check();
  }, [user, loading, hasRole]);

  if (loading || checkingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  // Block pending masters
  if (hasRole("master") && approvalStatus === "pending") {
    navigate("/pending-approval");
    return null;
  }

  // Only clients reach here
  return <ClientDashboard />;
};

export default Dashboard;
