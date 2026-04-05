import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CheckCircle, TrendingUp, Calendar, DollarSign, Headphones,
  Clock, XCircle, Loader2, LogIn, AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SPECIALIZATIONS = [
  "Электрика", "Сантехника", "Отделка", "Мебель и двери",
  "Умный дом", "Видеонаблюдение", "Сад и двор", "Сварка",
  "Подвалы и гаражи", "Клининг", "Ремонт под ключ",
  "Аварийные услуги 24/7", "Ремонт техники", "Кондиционеры",
  "Окна и двери", "Потолки", "Полы и ламинат", "Покраска",
];

const DISTRICTS = ["Сино", "Фирдавси", "Шохмансур", "Исмоили Сомони", "Пригород"];

// Страница позволяет пользователю подать заявку на роль мастера и увидеть её текущий статус.
const BecomeMaster = () => {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [existingApp, setExistingApp] = useState<any>(null);
  const [checkingApp, setCheckingApp] = useState(true);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
    district: "",
    specialization: "",
    experience_years: "",
    description: "",
  });

  const benefits = [
    { icon: TrendingUp, title: "Больше клиентов", desc: "Получайте заказы каждый день" },
    { icon: Calendar, title: "Гибкий график", desc: "Работайте когда удобно вам" },
    { icon: DollarSign, title: "Хороший доход", desc: "Зарабатывайте от 3000 сомонӣ/мес" },
    { icon: Headphones, title: "Поддержка 24/7", desc: "Мы всегда на связи" },
  ];

  // Проверяем существующую заявку и подставляем базовые данные пользователя в форму.
  useEffect(() => {
    const check = async () => {
      if (!user) { setCheckingApp(false); return; }
      const { data } = await supabase
        .from("master_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) setExistingApp(data[0]);
      // Pre-fill from profile
      setFormData(prev => ({
        ...prev,
        full_name: user.user_metadata?.full_name || "",
        email: user.email || "",
      }));
      setCheckingApp(false);
    };
    if (!authLoading) check();
  }, [user, authLoading]);

  // Отправляем заявку мастера в базу и создаём уведомление для пользователя.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate("/auth"); return; }
    if (!formData.district || !formData.specialization) {
      toast({ title: "Ошибка", description: "Заполните все обязательные поля", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("master_applications").insert({
      user_id: user.id,
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email,
      district: formData.district,
      specialization: formData.specialization,
      experience_years: parseInt(formData.experience_years) || 0,
      description: formData.description,
      status: "pending",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      // Send notification
      await supabase.from("notifications").insert({
        user_id: user.id,
        title: "Заявка отправлена",
        message: "Ваша заявка на мастера отправлена на рассмотрение администратору.",
        type: "application",
      });
      toast({ title: "Заявка отправлена!", description: "Администратор рассмотрит вашу заявку." });
      // Reload to show status
      const { data } = await supabase
        .from("master_applications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) setExistingApp(data[0]);
    }
  };

  const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string; message: string }> = {
    pending: {
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50 border-amber-200",
      label: "На рассмотрении",
      message: "Ваша заявка отправлена. Администратор рассматривает её. Мы уведомим вас о результате.",
    },
    approved: {
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50 border-green-200",
      label: "Одобрена",
      message: "Ваша заявка одобрена! Теперь вы можете работать как мастер. Перейдите в личный кабинет.",
    },
    rejected: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50 border-red-200",
      label: "Отклонена",
      message: "К сожалению, ваша заявка была отклонена. Вы можете подать новую заявку.",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-16 md:py-24">
        <div className="container px-4 mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">{t("becomeMasterTitle")}</h1>
            <p className="text-lg text-muted-foreground">{t("becomeMasterSubtitle")}</p>
          </motion.div>

          {/* Блок преимуществ объясняет, зачем мастеру регистрироваться на платформе. */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {benefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className="p-5 rounded-2xl bg-card border border-border text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center mb-3">
                  <b.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Ниже показывается либо статус текущей заявки, либо форма подачи новой. */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="max-w-lg mx-auto">

            {authLoading || checkingApp ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !user ? (
              <Card className="border-2 border-dashed border-primary/30">
                <CardContent className="py-12 text-center">
                  <LogIn className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-foreground mb-2">Войдите в аккаунт</h3>
                  <p className="text-muted-foreground mb-6">Чтобы подать заявку, необходимо войти или зарегистрироваться.</p>
                  <Button onClick={() => navigate("/auth")} className="rounded-full">
                    <LogIn className="w-4 h-4 mr-2" /> Войти / Зарегистрироваться
                  </Button>
                </CardContent>
              </Card>
            ) : existingApp && existingApp.status !== "rejected" ? (
              <Card className={`border ${statusConfig[existingApp.status]?.bg || ""}`}>
                <CardContent className="py-10 text-center">
                  {(() => {
                    const cfg = statusConfig[existingApp.status];
                    const Icon = cfg?.icon || Clock;
                    return (
                      <>
                        <Icon className={`w-14 h-14 mx-auto mb-4 ${cfg?.color || ""}`} />
                        <Badge className={`mb-4 ${cfg?.color || ""}`}>{cfg?.label || existingApp.status}</Badge>
                        <h3 className="text-xl font-bold text-foreground mb-2">Статус заявки</h3>
                        <p className="text-muted-foreground mb-2">{cfg?.message}</p>
                        <p className="text-xs text-muted-foreground">
                          Подана: {new Date(existingApp.created_at).toLocaleDateString("ru-RU")}
                        </p>
                        {existingApp.status === "approved" && (
                          <Button onClick={() => navigate("/master-dashboard")} className="rounded-full mt-6">
                            Перейти в кабинет мастера
                          </Button>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border">
                <CardContent className="p-8">
                  <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Подать заявку</h2>

                  {existingApp?.status === "rejected" && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 mb-6">
                      <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">Предыдущая заявка была отклонена</p>
                        <p className="text-xs text-red-600 mt-0.5">Вы можете подать новую заявку.</p>
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">ФИО *</label>
                      <Input placeholder="Фарход Назаров" value={formData.full_name}
                        onChange={e => setFormData({ ...formData, full_name: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Телефон *</label>
                        <Input placeholder="+992 900 00 00 00" value={formData.phone}
                          onChange={e => setFormData({ ...formData, phone: e.target.value })} required type="tel" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                        <Input placeholder="email@example.com" value={formData.email}
                          onChange={e => setFormData({ ...formData, email: e.target.value })} type="email" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Район *</label>
                        <Select value={formData.district} onValueChange={v => setFormData({ ...formData, district: v })}>
                          <SelectTrigger><SelectValue placeholder="Выберите район" /></SelectTrigger>
                          <SelectContent>
                            {DISTRICTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Опыт (лет)</label>
                        <Input placeholder="5" type="number" min={0} max={50} value={formData.experience_years}
                          onChange={e => setFormData({ ...formData, experience_years: e.target.value })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Специализация *</label>
                      <Select value={formData.specialization} onValueChange={v => setFormData({ ...formData, specialization: v })}>
                        <SelectTrigger><SelectValue placeholder="Выберите специализацию" /></SelectTrigger>
                        <SelectContent>
                          {SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">О себе</label>
                      <Textarea placeholder="Расскажите о вашем опыте и навыках..." value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })} rows={3} />
                    </div>
                    <Button type="submit" className="w-full rounded-full h-12 text-base" disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Отправить заявку
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default BecomeMaster;
