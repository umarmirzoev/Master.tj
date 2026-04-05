import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import MasterDashboardLayout from "./MasterDashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  ClipboardList, DollarSign, Star, Clock, User, CheckCircle, XCircle,
  Play, MapPin, Phone, Calendar, Image, Briefcase, Bell, TrendingUp,
  Navigation, Eye, Loader2, Camera, Upload, Trash2, Edit3, Award,
  Zap, AlertCircle, BarChart3, WifiOff, Wifi, ArrowRight, Hash, Package,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import OrderChat from "@/components/OrderChat";
import { useToast } from "@/hooks/use-toast";
import { PaymentStatusBadge } from "@/components/payment/PaymentComponents";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import MasterProducts from "./MasterProducts";
import { useNotifications } from "@/hooks/useNotifications";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  accepted: "bg-yellow-100 text-yellow-800",
  assigned: "bg-indigo-100 text-indigo-800",
  on_the_way: "bg-cyan-100 text-cyan-800",
  arrived: "bg-teal-100 text-teal-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  reviewed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  new: "Новый", accepted: "Принят", assigned: "Назначен",
  on_the_way: "В пути", arrived: "Прибыл", in_progress: "В работе",
  completed: "Завершён", reviewed: "Оценён", cancelled: "Отменён",
};

const DISTRICTS = [
  "Исмоили Сомонӣ", "Сино", "Фирдавсӣ", "Шоҳмансур",
  "Пригород", "Рудакӣ", "Варзоб",
];

type Tab = "overview" | "available" | "active" | "completed" | "earnings" | "profile" | "reviews" | "portfolio" | "notifications" | "schedule" | "products";

// Кабинет мастера управляет заказами, доходами, доступностью, профилем и товарами исполнителя.
export default function MasterDashboard() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const { notifications, unreadCount } = useNotifications(user?.id);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);

  // Profile editing
  const [editBio, setEditBio] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editName, setEditName] = useState("");
  const [editDistricts, setEditDistricts] = useState<string[]>([]);
  const [editCategories, setEditCategories] = useState<string[]>([]);
  const [editPriceMin, setEditPriceMin] = useState("");
  const [editPriceMax, setEditPriceMax] = useState("");
  const [editExperience, setEditExperience] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Portfolio add
  const [showAddPortfolio, setShowAddPortfolio] = useState(false);
  const [newWorkTitle, setNewWorkTitle] = useState("");
  const [newWorkCategory, setNewWorkCategory] = useState("");
  const [newWorkDesc, setNewWorkDesc] = useState("");
  const [newWorkUrl, setNewWorkUrl] = useState("");
  const [savingWork, setSavingWork] = useState(false);

  const fetchData = async () => {
    if (!user) return;
    const [ordersRes, reviewsRes, portfolioRes, catsRes, profileRes] = await Promise.all([
      supabase.from("orders").select("*, service_categories(name_ru), services(name_ru)").eq("master_id", user.id).order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").eq("master_id", user.id).order("created_at", { ascending: false }),
      supabase.from("master_portfolio").select("*").eq("master_id", user.id).order("created_at", { ascending: false }),
      supabase.from("service_categories").select("id, name_ru").order("sort_order"),
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
    ]);
    setOrders(ordersRes.data || []);
    setReviews(reviewsRes.data || []);
    setPortfolio(portfolioRes.data || []);
    setCategories(catsRes.data || []);
    if (profileRes.data) {
      setFullProfile(profileRes.data);
      setEditBio(profileRes.data.bio || "");
      setEditPhone(profileRes.data.phone || "");
      setEditName(profileRes.data.full_name || "");
      setEditDistricts(profileRes.data.working_districts || []);
      setEditCategories(profileRes.data.service_categories || []);
      setEditPriceMin(profileRes.data.price_min?.toString() || "");
      setEditPriceMax(profileRes.data.price_max?.toString() || "");
      setEditExperience(profileRes.data.experience_years?.toString() || "");
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);
  useRealtimeOrders({ userId: user?.id, role: "master", onUpdate: fetchData });

  const updateStatus = async (orderId: string, status: string, order: any) => {
    const updateData: any = { status };
    if (status === "accepted") updateData.accepted_at = new Date().toISOString();
    if (status === "in_progress") updateData.started_at = new Date().toISOString();
    if (status === "completed") updateData.completed_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Статус обновлён" });
      const statusMessages: Record<string, string> = {
        accepted: "Мастер принял ваш заказ",
        on_the_way: "Мастер выехал к вам",
        arrived: "Мастер прибыл на место",
        in_progress: "Мастер начал работу",
        completed: "Ваш заказ завершён",
      };
      if (statusMessages[status]) {
        await supabase.from("notifications").insert({
          user_id: order.client_id, title: "Обновление заказа",
          message: statusMessages[status], type: "order_status", related_id: orderId,
        });
      }
      fetchData();
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    await supabase.from("profiles").update({
      full_name: editName, phone: editPhone, bio: editBio,
      working_districts: editDistricts, service_categories: editCategories,
      price_min: parseFloat(editPriceMin) || 0, price_max: parseFloat(editPriceMax) || 0,
      experience_years: parseInt(editExperience) || 0,
    }).eq("user_id", user.id);
    // Also update master_listings if exists
    await supabase.from("master_listings").update({
      full_name: editName, phone: editPhone, bio: editBio,
      working_districts: editDistricts, service_categories: editCategories,
      price_min: parseFloat(editPriceMin) || 0, price_max: parseFloat(editPriceMax) || 0,
      experience_years: parseInt(editExperience) || 0,
      is_active: isAvailable,
    }).eq("user_id", user.id);
    setSavingProfile(false);
    toast({ title: "Профиль обновлён" });
    fetchData();
  };

  const addPortfolioItem = async () => {
    if (!user || !newWorkUrl || !newWorkTitle) return;
    setSavingWork(true);
    const { error } = await supabase.from("master_portfolio").insert({
      master_id: user.id,
      title: newWorkTitle,
      category: newWorkCategory,
      description: newWorkDesc,
      image_url: newWorkUrl,
    });
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Работа добавлена" });
      setNewWorkTitle(""); setNewWorkCategory(""); setNewWorkDesc(""); setNewWorkUrl("");
      setShowAddPortfolio(false);
      fetchData();
    }
    setSavingWork(false);
  };

  const deletePortfolioItem = async (id: string) => {
    await supabase.from("master_portfolio").delete().eq("id", id);
    toast({ title: "Работа удалена" });
    fetchData();
  };

  // Analytics
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const completedOrders = orders.filter(o => ["completed", "reviewed"].includes(o.status));
  const activeOrders = orders.filter(o => ["assigned", "accepted", "on_the_way", "arrived", "in_progress"].includes(o.status));
  const newOrders = orders.filter(o => o.status === "new" || o.status === "assigned");
  const cancelledOrders = orders.filter(o => o.status === "cancelled");
  const COMMISSION_RATE = 0.2;
  const getGross = (o: any) => (o.total_amount || o.budget || 0);
  const getPayout = (o: any) => (o as any).master_payout || Math.round(getGross(o) * (1 - COMMISSION_RATE));
  const totalGross = completedOrders.reduce((s, o) => s + getGross(o), 0);
  const totalEarnings = completedOrders.reduce((s, o) => s + getPayout(o), 0);
  const todayEarnings = completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= today).reduce((s, o) => s + getPayout(o), 0);
  const weekEarnings = completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= weekAgo).reduce((s, o) => s + getPayout(o), 0);
  const monthEarnings = completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= monthAgo).reduce((s, o) => s + getPayout(o), 0);
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const avgOrderValue = completedOrders.length > 0 ? Math.round(totalGross / completedOrders.length) : 0;
  const totalCommission = Math.round(totalGross * COMMISSION_RATE);

  // Rating distribution
  const ratingDist = useMemo(() => {
    const dist = [0, 0, 0, 0, 0];
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
    return dist.reverse(); // 5,4,3,2,1
  }, [reviews]);

  // Earnings chart data
  const earningsChart = useMemo(() => {
    const days: { date: string; amount: number; orders: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      const dayCompleted = completedOrders.filter(o => new Date(o.completed_at || o.created_at).toDateString() === d.toDateString());
      days.push({ date: dateStr, amount: dayCompleted.reduce((s, o) => s + getPayout(o), 0), orders: dayCompleted.length });
    }
    return days;
  }, [completedOrders]);

  // Earnings by category
  const earningsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    completedOrders.forEach(o => {
      const cat = o.service_categories?.name_ru || "Другое";
      map[cat] = (map[cat] || 0) + getPayout(o);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  }, [completedOrders]);

  // Schedule: today's and upcoming orders
  const todayOrders = orders.filter(o => {
    const d = new Date(o.preferred_time || o.created_at);
    return d.toDateString() === today.toDateString() && !["completed", "reviewed", "cancelled"].includes(o.status);
  });
  const upcomingOrders = orders.filter(o => {
    const d = new Date(o.preferred_time || o.created_at);
    return d > today && !["completed", "reviewed", "cancelled"].includes(o.status);
  });

  const navItems = [
    { path: "/master-dashboard", label: "Обзор", icon: Briefcase },
    { path: "/master-dashboard/available", label: "Новые заказы", icon: ClipboardList, badge: newOrders.length },
    { path: "/master-dashboard/active", label: "Активные", icon: Clock, badge: activeOrders.length },
    { path: "/master-dashboard/completed", label: "Завершённые", icon: CheckCircle },
    { path: "/master-dashboard/earnings", label: "Доход", icon: DollarSign },
    { path: "/master-dashboard/reviews", label: "Отзывы", icon: Star },
    { path: "/master-dashboard/portfolio", label: "Портфолио", icon: Image },
    { path: "/master-dashboard/profile", label: "Профиль мастера", icon: User },
    { path: "/master-dashboard/notifications", label: "Уведомления", icon: Bell, badge: unreadCount },
    { path: "/master-dashboard/products", label: "Мои товары", icon: Package },
  ];

  const stats = [
    { label: "Новые заказы", value: newOrders.length, icon: ClipboardList, gradient: "from-blue-500/15 to-sky-500/15", iconColor: "text-blue-600", iconBg: "bg-blue-500/15" },
    { label: "Активные", value: activeOrders.length, icon: Clock, gradient: "from-amber-500/15 to-yellow-500/15", iconColor: "text-amber-600", iconBg: "bg-amber-500/15" },
    { label: "Завершённые", value: completedOrders.length, icon: CheckCircle, gradient: "from-emerald-500/15 to-green-500/15", iconColor: "text-emerald-600", iconBg: "bg-emerald-500/15" },
    { label: "Рейтинг", value: avgRating, icon: Star, gradient: "from-orange-500/15 to-amber-500/15", iconColor: "text-orange-600", iconBg: "bg-orange-500/15" },
    { label: "Отзывов", value: reviews.length, icon: Award, gradient: "from-pink-500/15 to-rose-500/15", iconColor: "text-pink-600", iconBg: "bg-pink-500/15" },
    { label: "Сегодня", value: `${todayEarnings.toLocaleString()} с.`, icon: DollarSign, gradient: "from-emerald-500/15 to-teal-500/15", iconColor: "text-emerald-600", iconBg: "bg-emerald-500/15" },
    { label: "Неделя", value: `${weekEarnings.toLocaleString()} с.`, icon: TrendingUp, gradient: "from-blue-500/15 to-indigo-500/15", iconColor: "text-blue-600", iconBg: "bg-blue-500/15" },
    { label: "Месяц", value: `${monthEarnings.toLocaleString()} с.`, icon: BarChart3, gradient: "from-violet-500/15 to-purple-500/15", iconColor: "text-violet-600", iconBg: "bg-violet-500/15" },
  ];

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: "overview", label: "Обзор", icon: Briefcase },
    { key: "available", label: "Новые", icon: ClipboardList, count: newOrders.length },
    { key: "active", label: "Активные", icon: Clock, count: activeOrders.length },
    { key: "completed", label: "Завершённые", icon: CheckCircle },
    { key: "schedule", label: "Расписание", icon: Calendar },
    { key: "earnings", label: "Доход", icon: DollarSign },
    { key: "reviews", label: "Отзывы", icon: Star, count: reviews.length },
    { key: "portfolio", label: "Портфолио", icon: Image },
    { key: "profile", label: "Профиль", icon: User },
    { key: "notifications", label: "Уведомления", icon: Bell, count: unreadCount },
    { key: "products", label: "Мои товары", icon: Package },
  ];

  const StatusActionButtons = ({ order }: { order: any }) => (
    <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
      {(order.status === "new" || order.status === "assigned") && (
        <>
          <Button size="sm" onClick={() => updateStatus(order.id, "accepted", order)} className="rounded-full gap-1.5 text-xs bg-primary hover:bg-primary/90">
            <CheckCircle className="w-3.5 h-3.5" /> Принять
          </Button>
          <Button size="sm" variant="outline" onClick={() => updateStatus(order.id, "cancelled", order)} className="rounded-full gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10">
            <XCircle className="w-3.5 h-3.5" /> Отклонить
          </Button>
        </>
      )}
      {order.status === "accepted" && (
        <Button size="sm" onClick={() => updateStatus(order.id, "on_the_way", order)} className="rounded-full gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-700">
          <Navigation className="w-3.5 h-3.5" /> В пути
        </Button>
      )}
      {order.status === "on_the_way" && (
        <Button size="sm" onClick={() => updateStatus(order.id, "arrived", order)} className="rounded-full gap-1.5 text-xs bg-teal-600 hover:bg-teal-700">
          <MapPin className="w-3.5 h-3.5" /> Прибыл
        </Button>
      )}
      {order.status === "arrived" && (
        <Button size="sm" onClick={() => updateStatus(order.id, "in_progress", order)} className="rounded-full gap-1.5 text-xs bg-purple-600 hover:bg-purple-700">
          <Play className="w-3.5 h-3.5" /> Начать работу
        </Button>
      )}
      {order.status === "in_progress" && (
        <Button size="sm" onClick={() => updateStatus(order.id, "completed", order)} className="rounded-full gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle className="w-3.5 h-3.5" /> Завершить
        </Button>
      )}
    </div>
  );

  const OrderCard = ({ order, showActions = true }: { order: any; showActions?: boolean }) => (
    <Card className="hover:shadow-md transition-all border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-base">
              {order.services?.name_ru || order.service_categories?.name_ru || "Заказ"}
            </p>
            <div className="space-y-1 mt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3.5 h-3.5 shrink-0" /> <span className="truncate">{order.address}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone className="w-3.5 h-3.5 shrink-0" /> {order.phone}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                {new Date(order.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              {order.preferred_time && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 shrink-0" /> Время: {order.preferred_time}
                </div>
              )}
            </div>
            {order.budget > 0 && (
              <p className="text-sm font-bold text-primary mt-2">{order.budget} сомонӣ</p>
            )}
          </div>
          <Badge className={`${statusColors[order.status]} shrink-0`}>{statusLabels[order.status]}</Badge>
        </div>
        {order.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2 bg-muted/50 p-2 rounded-lg">{order.description}</p>}
        <div className="flex items-center justify-between">
          {showActions && <StatusActionButtons order={order} />}
          <Button variant="ghost" size="sm" onClick={() => setDetailOrder(order)} className="text-xs gap-1 text-muted-foreground hover:text-foreground ml-auto">
            <Eye className="w-3.5 h-3.5" /> Подробнее
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ icon: Icon, title, desc }: { icon: any; title: string; desc?: string }) => (
    <Card>
      <CardContent className="py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
          <Icon className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">{title}</p>
        {desc && <p className="text-xs text-muted-foreground/70 mt-1">{desc}</p>}
      </CardContent>
    </Card>
  );

  return (
    <MasterDashboardLayout title="Кабинет мастера" navItems={navItems} isAvailable={isAvailable} onToggleAvailability={() => setIsAvailable(!isAvailable)}>
      {/* Welcome Banner */}
      <Card className="mb-6 border-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden relative">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Салом, {(profile?.full_name || "Мастер").split(" ")[0]}! 👋
            </h2>
            <p className="text-muted-foreground mt-1">
              {activeOrders.length > 0
                ? `У вас ${activeOrders.length} активн${activeOrders.length === 1 ? "ый" : "ых"} заказ${activeOrders.length === 1 ? "" : activeOrders.length < 5 ? "а" : "ов"} сегодня.`
                : newOrders.length > 0
                  ? `${newOrders.length} нов${newOrders.length === 1 ? "ый" : "ых"} заказ${newOrders.length === 1 ? "" : newOrders.length < 5 ? "а" : "ов"} ждёт вашего ответа.`
                  : "Нет текущих заказов. Отдыхайте!"
              }
            </p>
            <div className="flex items-center gap-3 mt-3">
              <div className="flex items-center gap-1.5 text-sm">
                {isAvailable ? (
                  <><Wifi className="w-4 h-4 text-emerald-500" /><span className="text-emerald-600 font-medium">Онлайн</span></>
                ) : (
                  <><WifiOff className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">Оффлайн</span></>
                )}
              </div>
              <span className="text-muted-foreground/40">|</span>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-bold text-foreground">{avgRating}</span>
                <span className="text-muted-foreground">({reviews.length})</span>
              </div>
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <span className="text-3xl font-bold text-primary">
                {(profile?.full_name || "М").split(" ").map(w => w[0]).join("").slice(0, 2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {stats.map((s, i) => (
          <Card key={i} className={`bg-gradient-to-br ${s.gradient} border-0 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer`} onClick={() => {
            if (s.label === "Новые заказы") setTab("available");
            else if (s.label === "Активные") setTab("active");
            else if (s.label === "Завершённые") setTab("completed");
            else if (s.label === "Рейтинг" || s.label === "Отзывов") setTab("reviews");
          }}>
            <CardContent className="p-3">
              <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center mb-1.5`}>
                <s.icon className={`w-4.5 h-4.5 ${s.iconColor}`} />
              </div>
              <p className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 border-b border-border pb-2 overflow-x-auto scrollbar-hide">
        {tabs.map(tb => {
          const Icon = tb.icon;
          return (
            <Button key={tb.key} variant={tab === tb.key ? "default" : "ghost"} size="sm" onClick={() => setTab(tb.key)} className="rounded-full whitespace-nowrap gap-1.5 shrink-0 text-xs">
              <Icon className="w-3.5 h-3.5" />
              {tb.label}
              {tb.count !== undefined && tb.count > 0 && (
                <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px]">{tb.count}</Badge>
              )}
            </Button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : tab === "overview" ? (
        <div className="space-y-6">
          {/* Quick action cards */}
          {newOrders.length > 0 && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{newOrders.length} новых заказов</p>
                    <p className="text-xs text-muted-foreground">Ждут вашего ответа</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => setTab("available")} className="rounded-full gap-1">
                  Посмотреть <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Active orders summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" /> Активные заказы
                  {activeOrders.length > 0 && <Badge className="bg-amber-100 text-amber-800 text-xs">{activeOrders.length}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Нет активных заказов</p>
                ) : activeOrders.slice(0, 4).map(o => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors cursor-pointer" onClick={() => setDetailOrder(o)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{o.services?.name_ru || "Заказ"}</p>
                      <p className="text-xs text-muted-foreground">{o.address}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusColors[o.status]} text-[10px]`}>{statusLabels[o.status]}</Badge>
                    </div>
                  </div>
                ))}
                {activeOrders.length > 4 && (
                  <Button variant="ghost" size="sm" onClick={() => setTab("active")} className="w-full text-xs text-muted-foreground">
                    Все активные ({activeOrders.length}) <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Today schedule */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" /> Сегодня
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todayOrders.length === 0 && activeOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Нет заказов на сегодня</p>
                ) : [...todayOrders, ...activeOrders.filter(o => !todayOrders.includes(o))].slice(0, 4).map(o => (
                  <div key={o.id} className="flex items-center gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors" onClick={() => setDetailOrder(o)}>
                    <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{o.services?.name_ru || "Заказ"}</p>
                      <p className="text-[10px] text-muted-foreground">{o.address}</p>
                    </div>
                    <Badge className={`${statusColors[o.status]} text-[10px]`}>{statusLabels[o.status]}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Earnings summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-600" /> Доход
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 text-center">
                    <p className="text-xl font-bold text-emerald-600">{todayEarnings.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Сегодня</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 text-center">
                    <p className="text-xl font-bold text-blue-600">{weekEarnings.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Неделя</p>
                  </div>
                  <div className="p-3 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 text-center">
                    <p className="text-xl font-bold text-violet-600">{monthEarnings.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Месяц</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 text-center">
                    <p className="text-xl font-bold text-amber-600">{totalEarnings.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">Всего</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent reviews */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" /> Последние отзывы
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {reviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Пока нет отзывов</p>
                ) : reviews.slice(0, 3).map(r => (
                  <div key={r.id} className="p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-1 mb-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`w-3 h-3 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                      ))}
                      <span className="text-[10px] text-muted-foreground ml-2">{new Date(r.created_at).toLocaleDateString("ru-RU")}</span>
                    </div>
                    {r.comment && <p className="text-xs text-foreground line-clamp-2">{r.comment}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

      ) : tab === "available" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Новые / назначенные заказы</h2>
            <Badge className="bg-blue-100 text-blue-800">{newOrders.length}</Badge>
          </div>
          {newOrders.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Нет новых заказов" desc="Когда вам назначат заказ, он появится здесь" />
          ) : newOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </div>

      ) : tab === "active" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Активные заказы</h2>
            <Badge className="bg-amber-100 text-amber-800">{activeOrders.length}</Badge>
          </div>
          {activeOrders.length === 0 ? (
            <EmptyState icon={Clock} title="Нет активных заказов" desc="Примите заказ, чтобы он стал активным" />
          ) : activeOrders.map(o => <OrderCard key={o.id} order={o} />)}
        </div>

      ) : tab === "completed" ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Завершённые работы</h2>
            <Badge className="bg-emerald-100 text-emerald-800">{completedOrders.length}</Badge>
          </div>
          {completedOrders.length === 0 ? (
            <EmptyState icon={CheckCircle} title="Нет завершённых заказов" />
          ) : completedOrders.map(o => (
            <Card key={o.id} className="hover:shadow-md transition-all">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{o.services?.name_ru || "Заказ"}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(o.completed_at || o.created_at).toLocaleDateString("ru-RU")}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {o.address}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {o.budget > 0 && <p className="font-bold text-emerald-600">{o.budget} сомонӣ</p>}
                    <Badge className={`${statusColors[o.status]} text-[10px] mt-1`}>{statusLabels[o.status]}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      ) : tab === "schedule" ? (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Расписание
          </h2>

          {/* Today */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📅 Сегодня — {today.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[...todayOrders, ...activeOrders.filter(o => !todayOrders.includes(o))].length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет заказов на сегодня</p>
              ) : [...todayOrders, ...activeOrders.filter(o => !todayOrders.includes(o))].map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => setDetailOrder(o)}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-2 h-8 rounded-full bg-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{o.services?.name_ru || "Заказ"}</p>
                      <p className="text-xs text-muted-foreground">{o.address} • {o.phone}</p>
                    </div>
                  </div>
                  <Badge className={`${statusColors[o.status]} text-[10px]`}>{statusLabels[o.status]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">📋 Предстоящие</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {upcomingOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет предстоящих заказов</p>
              ) : upcomingOrders.slice(0, 10).map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setDetailOrder(o)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.services?.name_ru || "Заказ"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.preferred_time || o.created_at).toLocaleDateString("ru-RU")} • {o.address}</p>
                  </div>
                  <Badge className={`${statusColors[o.status]} text-[10px]`}>{statusLabels[o.status]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Completed today */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">✅ Завершены сегодня</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= today).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет завершённых сегодня</p>
              ) : completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= today).map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20">
                  <p className="text-sm font-medium">{o.services?.name_ru || "Заказ"}</p>
                  {o.budget > 0 && <span className="font-bold text-emerald-600 text-sm">+{o.budget} сомонӣ</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      ) : tab === "earnings" ? (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-foreground">Мой доход</h2>

          {/* Earnings hero cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white border-0">
              <CardContent className="p-5">
                <DollarSign className="w-6 h-6 mb-1 opacity-80" />
                <p className="text-2xl font-bold">{todayEarnings.toLocaleString()}</p>
                <p className="text-sm opacity-80">Сегодня</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-0">
              <CardContent className="p-5">
                <TrendingUp className="w-6 h-6 mb-1 opacity-80" />
                <p className="text-2xl font-bold">{weekEarnings.toLocaleString()}</p>
                <p className="text-sm opacity-80">Неделя</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white border-0">
              <CardContent className="p-5">
                <BarChart3 className="w-6 h-6 mb-1 opacity-80" />
                <p className="text-2xl font-bold">{monthEarnings.toLocaleString()}</p>
                <p className="text-sm opacity-80">Месяц</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0">
              <CardContent className="p-5">
                <DollarSign className="w-6 h-6 mb-1 opacity-80" />
                <p className="text-2xl font-bold">{totalEarnings.toLocaleString()}</p>
                <p className="text-sm opacity-80">Всего</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{avgOrderValue.toLocaleString()}</p><p className="text-xs text-muted-foreground">Ср. чек (сомонӣ)</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{completedOrders.length}</p><p className="text-xs text-muted-foreground">Выполнено заказов</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{completedOrders.filter(o => (o as any).payment_status === "paid").length}</p><p className="text-xs text-muted-foreground">Оплачено</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{totalEarnings.toLocaleString()}</p><p className="text-xs text-muted-foreground">Чистый доход (сомонӣ)</p></CardContent></Card>
          </div>

          {/* Commission breakdown */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-lg font-bold text-foreground">{totalGross.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">Валовый доход (сомонӣ)</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-amber-600">{totalCommission.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">Комиссия (20%)</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{totalEarnings.toLocaleString()}</p>
                  <p className="text-[11px] text-muted-foreground">На руки (сомонӣ)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Earnings chart */}
          {earningsChart.some(d => d.amount > 0) && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Доход за 14 дней</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={earningsChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="amount" fill="hsl(160, 84%, 30%)" radius={[4, 4, 0, 0]} name="Доход" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Earnings by category */}
          {earningsByCategory.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Доход по категориям</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {earningsByCategory.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="font-bold text-primary text-sm">{c.value.toLocaleString()} сомонӣ</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Completed orders list */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">История заработка</CardTitle></CardHeader>
            <CardContent>
              {completedOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет завершённых заказов</p>
              ) : (
                <div className="space-y-1.5">
                  {completedOrders.slice(0, 25).map(o => (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{o.services?.name_ru || "Заказ"}</p>
                        <p className="text-xs text-muted-foreground">{new Date(o.completed_at || o.created_at).toLocaleDateString("ru-RU")}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PaymentStatusBadge status={(o as any).payment_status || "unpaid"} />
                        <div className="text-right">
                          <span className="font-bold text-emerald-600 text-sm">+{getPayout(o).toLocaleString()} сомонӣ</span>
                          {getGross(o) !== getPayout(o) && (
                            <p className="text-[10px] text-muted-foreground">из {getGross(o).toLocaleString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      ) : tab === "reviews" ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Отзывы клиентов</h2>
            <div className="flex items-center gap-2 text-sm">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              <span className="font-bold text-lg">{avgRating}</span>
              <span className="text-muted-foreground">({reviews.length})</span>
            </div>
          </div>

          {/* Rating distribution */}
          {reviews.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Распределение оценок</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {[5, 4, 3, 2, 1].map((star, idx) => {
                  const count = ratingDist[idx];
                  const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <div className="flex items-center gap-1 w-14 shrink-0">
                        <span className="text-sm font-medium">{star}</span>
                        <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <Progress value={pct} className="h-2.5" />
                      </div>
                      <span className="text-xs text-muted-foreground w-10 text-right">{count}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {reviews.length === 0 ? (
            <EmptyState icon={Star} title="Пока нет отзывов" desc="После завершения заказов клиенты смогут оставить отзыв" />
          ) : reviews.map(r => (
            <Card key={r.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
                </div>
                {r.comment && <p className="text-sm text-foreground leading-relaxed">{r.comment}</p>}
                {r.photos && r.photos.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {r.photos.map((p: string, i: number) => (
                      <img key={i} src={p} alt="" className="w-16 h-16 rounded-lg object-cover" />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

      ) : tab === "portfolio" ? (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">Мои работы</h2>
            <Button size="sm" onClick={() => setShowAddPortfolio(true)} className="rounded-full gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Добавить работу
            </Button>
          </div>

          {portfolio.length === 0 ? (
            <EmptyState icon={Camera} title="Портфолио пусто" desc="Загрузите фото ваших работ, чтобы привлечь больше клиентов" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {portfolio.map(p => (
                <Card key={p.id} className="overflow-hidden group relative">
                  <div className="aspect-square bg-muted relative">
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-start justify-end p-3">
                      <p className="text-white text-sm font-medium">{p.title}</p>
                      {p.category && <p className="text-white/70 text-xs">{p.category}</p>}
                      {p.description && <p className="text-white/60 text-xs mt-1 line-clamp-2">{p.description}</p>}
                    </div>
                    <Button
                      variant="destructive" size="icon"
                      className="absolute top-2 right-2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => deletePortfolioItem(p.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Add portfolio dialog */}
          <Dialog open={showAddPortfolio} onOpenChange={setShowAddPortfolio}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader><DialogTitle>Добавить работу</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Название *</label>
                  <Input value={newWorkTitle} onChange={e => setNewWorkTitle(e.target.value)} placeholder="Например: Ремонт ванной" className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Категория</label>
                  <Input value={newWorkCategory} onChange={e => setNewWorkCategory(e.target.value)} placeholder="Сантехника, Электрика..." className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">URL фото *</label>
                  <Input value={newWorkUrl} onChange={e => setNewWorkUrl(e.target.value)} placeholder="https://..." className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Описание</label>
                  <Textarea value={newWorkDesc} onChange={e => setNewWorkDesc(e.target.value)} rows={2} placeholder="Кратко опишите выполненную работу" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddPortfolio(false)} className="rounded-full">Отмена</Button>
                <Button onClick={addPortfolioItem} disabled={savingWork || !newWorkTitle || !newWorkUrl} className="rounded-full gap-1">
                  {savingWork && <Loader2 className="w-4 h-4 animate-spin" />} Добавить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

      ) : tab === "profile" ? (
        <div className="space-y-5">
          <h2 className="text-lg font-bold text-foreground">Профиль мастера</h2>

          {/* Profile preview */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-3xl font-bold text-primary">
                    {(editName || "М").split(" ").map(w => w[0]).join("").slice(0, 2)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-xl">{editName || "Мастер"}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /> {avgRating}</span>
                    <span>•</span>
                    <span>{completedOrders.length} заказов</span>
                    <span>•</span>
                    <span>{totalEarnings.toLocaleString()} сомонӣ</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
                    <span className="text-sm">{isAvailable ? "Доступен для заказов" : "Не доступен"}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Basic info */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Основная информация</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Полное имя</label>
                  <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Телефон</label>
                  <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-11" placeholder="+992 ..." />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Опыт (лет)</label>
                  <Input type="number" value={editExperience} onChange={e => setEditExperience(e.target.value)} className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">О себе</label>
                  <Textarea value={editBio} onChange={e => setEditBio(e.target.value)} rows={4} placeholder="Расскажите о вашем опыте и специализации..." />
                </div>
              </CardContent>
            </Card>

            {/* Work details */}
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Рабочие параметры</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Районы работы</label>
                  <div className="flex flex-wrap gap-2">
                    {DISTRICTS.map(d => (
                      <Badge
                        key={d}
                        variant={editDistricts.includes(d) ? "default" : "outline"}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setEditDistricts(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])}
                      >
                        {d}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Категории услуг</label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <Badge
                        key={c.id}
                        variant={editCategories.includes(c.name_ru) ? "default" : "outline"}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setEditCategories(prev => prev.includes(c.name_ru) ? prev.filter(x => x !== c.name_ru) : [...prev, c.name_ru])}
                      >
                        {c.name_ru}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Мин. цена (сомонӣ)</label>
                    <Input type="number" value={editPriceMin} onChange={e => setEditPriceMin(e.target.value)} className="h-11" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-1 block">Макс. цена (сомонӣ)</label>
                    <Input type="number" value={editPriceMax} onChange={e => setEditPriceMax(e.target.value)} className="h-11" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Button onClick={saveProfile} disabled={savingProfile} className="rounded-full gap-1.5 w-full sm:w-auto">
            {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Сохранить профиль
          </Button>
        </div>

      ) : tab === "notifications" ? (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground mb-2">Уведомления</h2>
          {notifications.length === 0 ? (
            <EmptyState icon={Bell} title="Нет уведомлений" />
          ) : notifications.map(n => (
            <Card key={n.id} className={!n.read ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!n.read ? "bg-primary/15" : "bg-muted"}`}>
                    <Bell className={`w-4 h-4 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(n.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Products tab */}
      {tab === "products" && <MasterProducts />}

      {/* Order detail dialog */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Детали заказа</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <Badge className={`${statusColors[detailOrder.status]} text-sm px-3 py-1`}>{statusLabels[detailOrder.status]}</Badge>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1"><span className="text-muted-foreground text-xs">Услуга</span><p className="font-medium">{detailOrder.services?.name_ru || "—"}</p></div>
                <div className="space-y-1"><span className="text-muted-foreground text-xs">Категория</span><p className="font-medium">{detailOrder.service_categories?.name_ru || "—"}</p></div>
                <div className="space-y-1"><span className="text-muted-foreground text-xs">Телефон клиента</span><p className="font-medium">{detailOrder.phone}</p></div>
                <div className="space-y-1"><span className="text-muted-foreground text-xs">Дата</span><p className="font-medium">{new Date(detailOrder.created_at).toLocaleDateString("ru-RU")}</p></div>
                <div className="col-span-2 space-y-1"><span className="text-muted-foreground text-xs">Адрес</span><p className="font-medium">{detailOrder.address}</p></div>
                {detailOrder.description && (
                  <div className="col-span-2 space-y-1"><span className="text-muted-foreground text-xs">Описание</span><p className="font-medium bg-muted/50 p-2 rounded-lg">{detailOrder.description}</p></div>
                )}
                {detailOrder.preferred_time && (
                  <div className="space-y-1"><span className="text-muted-foreground text-xs">Время</span><p className="font-medium">{detailOrder.preferred_time}</p></div>
                )}
                {detailOrder.budget > 0 && (
                  <div className="space-y-1"><span className="text-muted-foreground text-xs">Бюджет</span><p className="font-bold text-primary text-lg">{detailOrder.budget} сомонӣ</p></div>
                )}
              </div>
              <div className="border-t border-border pt-4">
                <StatusActionButtons order={detailOrder} />
              </div>
              {/* Chat with client */}
              {!["cancelled", "new"].includes(detailOrder.status) && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl gap-2"
                  onClick={() => setChatOrderId(detailOrder.id)}
                >
                  <Bell className="w-4 h-4" />
                  Чат с клиентом
                </Button>
              )}
            </div>
          )}

          {/* Inline chat */}
          {chatOrderId === detailOrder?.id && (
            <div className="h-80 mt-2 -mx-6 -mb-6 border-t border-border">
              <OrderChat
                orderId={chatOrderId}
                isOpen={true}
                onClose={() => setChatOrderId(null)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MasterDashboardLayout>
  );
}
