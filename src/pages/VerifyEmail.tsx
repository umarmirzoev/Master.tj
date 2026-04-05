import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Mail, RefreshCw, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Страница просит пользователя подтвердить email и позволяет повторно отправить письмо.
export default function VerifyEmail() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);

  // Если почта уже подтверждена, не держим пользователя на промежуточной странице.
  if (user?.email_confirmed_at) {
    setTimeout(() => navigate("/dashboard"), 0);
    return null;
  }

  // Повторно отправляем письмо подтверждения на текущий email пользователя.
  const handleResend = async () => {
    if (!user?.email) return;
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    setResending(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Письмо отправлено повторно" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 mx-auto py-16 flex justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Mail className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Подтвердите email</h2>
            <p className="text-muted-foreground mb-6">
              Мы отправили письмо на{" "}
              <span className="font-medium text-foreground">{user?.email}</span>.
              Перейдите по ссылке для подтверждения.
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={handleResend} variant="outline" className="rounded-full gap-2" disabled={resending}>
                <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                Отправить повторно
              </Button>
              <Button onClick={signOut} variant="ghost" className="rounded-full gap-2 text-muted-foreground">
                <LogOut className="w-4 h-4" />
                Выйти
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
