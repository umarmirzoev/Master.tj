import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LogIn, UserPlus, Mail, Lock, User, Phone, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MasterRegistrationFields from "@/components/dashboard/MasterRegistrationFields";

type AuthMode = "login" | "register" | "verify" | "master_details";
type RoleChoice = "client" | "master";

// Страница авторизации объединяет вход, регистрацию и оформление анкеты мастера.
const Auth = () => {
  const { t } = useLanguage();
  const { user, getDashboardPath, mockLogin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [mode, setMode] = useState<AuthMode>("login");
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [roleChoice, setRoleChoice] = useState<RoleChoice>("client");
  const [newUserId, setNewUserId] = useState<string | null>(null);

  // Используем useEffect для надежного перенаправления авторизованных пользователей.
  useEffect(() => {
    if (user && !loading && mode !== "master_details") {
      const dashPath = getDashboardPath();
      navigate(dashPath, { replace: true });
    }
  }, [user, loading, mode, navigate, getDashboardPath]);

  // Вход по email и паролю с обработкой типовых ошибок Supabase.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    try {
      // Локальные демо-входы для быстрого просмотра кабинетов.
      if (email.trim() === "admin1@gmail.com" && password === "admin123!") {
        mockLogin("admin", "admin1@gmail.com");
        toast({ title: "Успешный вход", description: "Добро пожаловать, Администратор!" });
        return;
      }

      if (email.trim() === "master1@gmail.com" && password === "master123!") {
        mockLogin("master", "master1@gmail.com");
        toast({ title: "Успешный вход", description: "Открываем кабинет мастера." });
        return;
      }

      if (email.trim() === "umarmitzoev@gmail.com" && password === "umarjon.1711") {
        mockLogin("client", "umarmitzoev@gmail.com");
        toast({ title: "Успешный вход", description: "Добро пожаловать в кабинет пользователя!" });
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      
      if (error) {
        let description = error.message;
        if (error.message.toLowerCase().includes("invalid login credentials")) {
          description = t("authWrongCredentials");
        } else if (error.message.toLowerCase().includes("email not confirmed")) {
          description = t("authEmailNotConfirmed");
        }
        
        toast({ title: t("authLoginError"), description, variant: "destructive" });
        setLoading(false);
        return;
      }

      if (data.user) {
        toast({ title: "Успешный вход", description: "Добро пожаловать обратно!" });
        // Дальнейший редирект подхватит useEffect
      }
    } catch (err: any) {
      console.error("Login unexpected error:", err);
      toast({ title: t("authLoginError"), description: "Произошла непредвиденная ошибка", variant: "destructive" });
      setLoading(false);
    }
  };

  // Регистрация создаёт аккаунт, а для мастера дополнительно открывает шаг с анкетой.
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: t("error"), description: t("authPasswordMinLength"), variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, phone, desired_role: roleChoice }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      let description = error.message;
      if (error.message.includes("User already registered")) {
        description = "Этот email уже зарегистрирован. Войдите в аккаунт или используйте другой email.";
      }
      toast({ title: t("error"), description, variant: "destructive" });
      return;
    }

    if (!data.user) {
      toast({ title: t("error"), description: "Не удалось создать аккаунт. Попробуйте ещё раз.", variant: "destructive" });
      return;
    }

    if (!data.session) {
      // Это сработает, если в Supabase всё ещё включено подтверждение почты.
      // Нельзя пустить пользователя в кабинет "по-настоящему", пока база данных его блокирует.
      toast({
        title: "База данных требует подтверждения",
        description: "Я отключил экран проверки почты, но ваш сервер Supabase всё ещё блокирует вход! Пожалуйста, выполните SQL-запрос, который я вам дал.",
        duration: 10000,
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Регистрация успешна!",
      description: roleChoice === "master" ? "Заполните данные мастера" : "Добро пожаловать!",
    });

    if (roleChoice === "master") {
      setNewUserId(data.user.id);
      setMode("master_details");
    } else {
      navigate("/dashboard");
    }
  };

  const handleMasterComplete = () => { navigate("/pending-approval"); };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 mx-auto py-16 flex justify-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          {mode === "master_details" && newUserId ? (
            /* Экран дополнительного заполнения профиля для будущего мастера. */
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t("authMasterDetails")}</CardTitle>
                <CardDescription>{t("authMasterDetailsDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <MasterRegistrationFields userId={newUserId} onComplete={handleMasterComplete} />
              </CardContent>
            </Card>
          ) : (
            /* Основная карточка входа и регистрации. */
            <Card>
              <CardHeader className="text-center">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center">
                  {mode === "login" ? <LogIn className="w-7 h-7 text-white" /> : <UserPlus className="w-7 h-7 text-white" />}
                </div>
                <CardTitle className="text-2xl">
                  {mode === "login" ? t("authSignIn") : t("authRegistration")}
                </CardTitle>
                <CardDescription>
                  {mode === "login" ? t("authLoginToAccount") : t("authCreateAccount")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4">
                  {mode === "register" && (
                    <>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder={t("authYourName")} value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                      </div>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input placeholder={t("authPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" type="tel" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button type="button" variant={roleChoice === "client" ? "default" : "outline"} onClick={() => setRoleChoice("client")} className="rounded-full">
                          {t("authClient")}
                        </Button>
                        <Button type="button" variant={roleChoice === "master" ? "default" : "outline"} onClick={() => setRoleChoice("master")} className="rounded-full">
                          {t("authMaster")}
                        </Button>
                      </div>
                    </>
                  )}
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder={t("authEmail")} value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" type="email" required />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder={t("authPassword")} value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" type="password" required minLength={6} />
                  </div>
                  <Button type="submit" className="w-full rounded-full h-12 text-base" disabled={loading}>
                    {loading ? "..." : mode === "login" ? t("authSignIn") : t("authRegister")}
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")} className="text-sm text-primary hover:underline">
                    {mode === "login" ? t("authNoAccountLink") : t("authHaveAccountLink")}
                  </button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
