import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Clock, LogOut } from "lucide-react";

// Страница сообщает мастеру, что его заявка ещё ожидает проверки администратором.
export default function PendingApproval() {
  const { signOut, hasRole, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Если админ уже одобрил заявку, сразу переводим мастера в его кабинет.
  useEffect(() => {
    if (hasRole("master") && profile?.approval_status === "approved") {
      navigate("/master-dashboard", { replace: true });
    }
  }, [hasRole, navigate, profile?.approval_status]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* Экран нужен как промежуточное состояние, пока администратор не проверил заявку мастера. */}
      <div className="container px-4 mx-auto py-16 flex justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">{t("pendingTitle")}</h2>
            <p className="text-muted-foreground mb-6">{t("pendingDesc")}</p>
            <Button onClick={signOut} variant="outline" className="rounded-full gap-2">
              <LogOut className="w-4 h-4" /> {t("logout")}
            </Button>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
