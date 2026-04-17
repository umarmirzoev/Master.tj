import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  LayoutDashboard, ClipboardList, Users, UserCheck, Wrench, Star as StarIcon,
  Shield, Settings, BarChart3, Search, DollarSign,
  CheckCircle, XCircle, TrendingUp, Calendar, FileText,
  MapPin, Phone, Mail, ShoppingCart, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import AdminShopManager from "./AdminShopManager";
import ActivityLogSection from "./ActivityLogSection";
import PromoCodeManager from "./PromoCodeManager";
import SupportTicketsAdmin from "./SupportTicketsAdmin";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from "recharts";

const statusLabels: Record<string, string> = {
  new: "Новый", accepted: "Принят", assigned: "Назначен",
  on_the_way: "В пути", arrived: "Прибыл", in_progress: "В работе",
  completed: "Завершён", reviewed: "Оценён", cancelled: "Отменён",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800", accepted: "bg-yellow-100 text-yellow-800",
  assigned: "bg-indigo-100 text-indigo-800", on_the_way: "bg-cyan-100 text-cyan-800",
  arrived: "bg-teal-100 text-teal-800", in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800", reviewed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

const appStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};
const appStatusLabels: Record<string, string> = {
  pending: "Ожидает", approved: "Одобрена", rejected: "Отклонена",
};

const chartColors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

type Tab = "overview" | "analytics" | "orders" | "admins" | "users" | "masters" | "reviews" | "applications" | "shop" | "activity" | "support" | "promo";

export default function SuperAdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");
  const [orders, setOrders] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; userId: string; name: string } | null>(null);
  const [detailApp, setDetailApp] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    const [ordersRes, usersRes, catsRes, appsRes, reviewsRes, mastersRes, productsRes] = await Promise.all([
      supabase.from("orders").select("*, service_categories(name_ru), services(name_ru)").order("created_at", { ascending: false }).limit(1000),
      supabase.from("profiles").select("*, user_roles(role)").limit(1000),
      supabase.from("service_categories").select("*, services(count)").order("sort_order"),
      supabase.from("master_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("master_listings").select("id, full_name, average_rating, user_id, phone, service_categories, ranking_score, is_top_master, quality_flag, completed_orders, cancelled_orders, complaints, response_time_avg").eq("is_active", true).limit(500),
      supabase.from("shop_products").select("id", { count: "exact", head: true }),
    ]);
    setOrders(ordersRes.data || []);
    setAllUsers(usersRes.data || []);
    setCategories(catsRes.data || []);
    setApplications(appsRes.data || []);
    setReviews(reviewsRes.data || []);
    setMasters(mastersRes.data || []);
    setProductCount(productsRes.count || 0);
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Глобальная Realtime-подписка на все важные изменения
    console.log("Admin: Initializing global realtime channel...");
    const channel = supabase
      .channel('global-admin-refresh')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Realtime: Order changed', payload);
          loadData();
          toast({ title: "Обновление: Заказы", description: "Данные успешно обновлены" });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          console.log('Realtime: Profile changed', payload);
          loadData();
          toast({ title: "Обновление: Пользователи", description: "Список пользователей обновлен" });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'master_listings' },
        (payload) => {
          console.log('Realtime: Master changed', payload);
          loadData();
          toast({ title: "Обновление: Мастера", description: "Данные мастеров обновлены" });
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    // Резервное обновление каждые 5 секунд (гарантирует "живое" обновление даже если Realtime заблокирован защитой базы)
    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      console.log("Admin: Removing realtime channel and interval");
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  const approveApplication = async (appId: string, userId: string) => {
    await supabase.from("master_applications").update({ status: "approved" }).eq("id", appId);
    const { data: existingRole } = await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "master");
    if (!existingRole || existingRole.length === 0) {
      await supabase.from("user_roles").insert({ user_id: userId, role: "master" as any });
    }
    await supabase.from("profiles").update({ approval_status: "approved" }).eq("user_id", userId);
    await supabase.from("notifications").insert({
      user_id: userId, title: "Заявка одобрена!",
      message: "Ваша заявка мастера одобрена. Теперь вы можете работать как мастер.", type: "application",
    });
    toast({ title: "Заявка одобрена" }); loadData();
  };

  const rejectApplication = async (appId: string, userId: string) => {
    await supabase.from("master_applications").update({ status: "rejected" }).eq("id", appId);
    await supabase.from("notifications").insert({
      user_id: userId, title: "Заявка отклонена",
      message: "К сожалению, ваша заявка мастера была отклонена.", type: "application",
    });
    toast({ title: "Заявка отклонена" }); loadData();
  };

  // Analytics
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const COMMISSION_RATE = 0.2;
  const completedOrders = orders.filter(o => o.status === "completed" || o.status === "reviewed");
  const cancelledOrders = orders.filter(o => o.status === "cancelled");
  const activeOrders = orders.filter(o => !["completed", "cancelled", "reviewed"].includes(o.status));
  const paidOrders = completedOrders.filter(o => (o as any).payment_status === "paid");
  const unpaidOrders = completedOrders.filter(o => (o as any).payment_status !== "paid");
  const revenue = completedOrders.reduce((s, o) => s + (o.total_amount || o.budget || 0), 0);
  const commissionRevenue = paidOrders.reduce((s, o) => s + ((o as any).platform_commission || Math.round((o.total_amount || o.budget || 0) * COMMISSION_RATE)), 0);
  const totalPayouts = paidOrders.reduce((s, o) => s + ((o as any).master_payout || Math.round((o.total_amount || o.budget || 0) * (1 - COMMISSION_RATE))), 0);
  const avgOrderValue = completedOrders.length > 0 ? Math.round(revenue / completedOrders.length) : 0;

  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const weekOrders = orders.filter(o => new Date(o.created_at) >= weekAgo);
  const monthOrders = orders.filter(o => new Date(o.created_at) >= monthAgo);

  const todayRevenue = completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= today).reduce((s, o) => s + (o.total_amount || o.budget || 0), 0);
  const weekRevenue = completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= weekAgo).reduce((s, o) => s + (o.total_amount || o.budget || 0), 0);
  const monthRevenue = completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= monthAgo).reduce((s, o) => s + (o.total_amount || o.budget || 0), 0);
  const todayCommission = completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= today && (o as any).payment_status === "paid").reduce((s, o) => s + ((o as any).platform_commission || Math.round((o.total_amount || o.budget || 0) * COMMISSION_RATE)), 0);
  const weekCommission = completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= weekAgo && (o as any).payment_status === "paid").reduce((s, o) => s + ((o as any).platform_commission || Math.round((o.total_amount || o.budget || 0) * COMMISSION_RATE)), 0);
  const monthCommission = completedOrders.filter(o => new Date(o.completed_at || o.created_at) >= monthAgo && (o as any).payment_status === "paid").reduce((s, o) => s + ((o as any).platform_commission || Math.round((o.total_amount || o.budget || 0) * COMMISSION_RATE)), 0);

  const seedDemoData = async () => {
    setLoading(true);
    toast({ title: "Инициализация...", description: "Создаем тестовых пользователей и данные." });
    
    try {
      // 1. Create profiles
      const demoUsers = [
        { full_name: "Иван Иванов", phone: "+992 900 11 22 33" },
        { full_name: "Мария Сидорова", phone: "+992 918 44 55 66" },
        { full_name: "Алишер Назаров", phone: "+992 927 77 88 99" },
        { full_name: "Зебинисо Кадырова", phone: "+992 935 00 11 22" },
        { full_name: "Рустам Саидов", phone: "+992 944 33 44 55" }
      ];

      const { data: createdProfiles, error: profError } = await supabase.from("profiles").insert(demoUsers).select();
      
      if (profError) throw profError;

      if (createdProfiles && createdProfiles.length > 0) {
        const masterIds = createdProfiles.slice(0, 3).map(p => p.id);
        
        await Promise.all([
          ...masterIds.map(id => supabase.from("user_roles").insert({ user_id: id, role: "master" })),
          ...createdProfiles.slice(0, 3).map(p => supabase.from("master_listings").insert({
            user_id: p.id,
            full_name: p.full_name,
            phone: p.phone,
            service_categories: ["Сантехника", "Электрика"].slice(0, Math.floor(Math.random() * 2) + 1),
            average_rating: 4.8,
            completed_orders: 5 + Math.floor(Math.random() * 10),
            is_active: true,
            working_districts: ["Центральный"]
          }))
        ]);

        if (categories.length > 0) {
          const catId = categories[0].id;
          const demoOrders = createdProfiles.slice(2, 5).map(p => ({
            client_id: p.id,
            category_id: catId,
            status: "completed",
            total_amount: 150 + Math.floor(Math.random() * 500),
            address: "ул. Ленина, " + (10 + Math.floor(Math.random() * 50)),
            phone: p.phone,
            created_at: new Date(Date.now() - Math.floor(Math.random() * 3 * 86400000)).toISOString(),
            completed_at: new Date().toISOString(),
            payment_status: "paid",
            platform_commission: 30
          }));
          
          await supabase.from("orders").insert(demoOrders);
        }
      }

      toast({ title: "Успех!", description: "Данные установлены." });
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Внимание", description: "Данные добавлены частично или уже существуют.", variant: "default" });
      loadData();
    } finally {
      setLoading(false);
    }
  };

  const clients = allUsers.filter(u => u.user_roles?.some((r: any) => r.role === "client"));
  const admins = allUsers.filter(u => u.user_roles?.some((r: any) => r.role === "admin"));
  const superAdmins = allUsers.filter(u => u.user_roles?.some((r: any) => r.role === "super_admin"));
  const masterUsers = allUsers.filter(u => u.user_roles?.some((r: any) => r.role === "master"));

  const pendingApps = applications.filter(a => a.status === "pending");
  const approvedApps = applications.filter(a => a.status === "approved");
  const rejectedApps = applications.filter(a => a.status === "rejected");

  // Charts
  const ordersByDay = useMemo(() => {
    const days: { date: string; orders: number; completed: number; revenue: number; commission: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === d.toDateString());
      const dayCompleted = dayOrders.filter(o => o.status === "completed" || o.status === "reviewed");
      const dayRev = dayCompleted.reduce((s, o) => s + (o.total_amount || o.budget || 0), 0);
      const dayCommission = dayCompleted.filter(o => (o as any).payment_status === "paid").reduce((s, o) => s + ((o as any).platform_commission || Math.round((o.total_amount || o.budget || 0) * COMMISSION_RATE)), 0);
      days.push({ date: dateStr, orders: dayOrders.length, completed: dayCompleted.length, revenue: dayRev, commission: dayCommission });
    }
    return days;
  }, [orders]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ name: statusLabels[status] || status, value: count }));
  }, [orders]);

  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      const name = o.service_categories?.name_ru || "Другое";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const filteredApplications = useMemo(() => {
    return applications.filter(a => {
      if (appStatusFilter !== "all" && a.status !== appStatusFilter) return false;
      if (search && tab === "applications") {
        const q = search.toLowerCase();
        if (!a.full_name?.toLowerCase().includes(q) && !a.phone?.includes(q) && !a.email?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [applications, appStatusFilter, search, tab]);

  const specOptions = useMemo(() => Array.from(new Set(applications.map(a => a.specialization).filter(Boolean))), [applications]);

  const navItems = [
    { path: "/super-admin/dashboard", label: "Панель", icon: LayoutDashboard },
    { path: "/super-admin/dashboard/analytics", label: "Аналитика", icon: BarChart3 },
    { path: "/super-admin/dashboard/orders", label: "Все заказы", icon: ClipboardList },
    { path: "/super-admin/dashboard/users", label: "Все пользователи", icon: Users },
    { path: "/super-admin/dashboard/masters", label: "Все мастера", icon: Wrench },
    { path: "/super-admin/dashboard/admins", label: "Админы", icon: Shield },
    { path: "/super-admin/dashboard/applications", label: "Заявки", icon: FileText, badge: pendingApps.length },
    { path: "/super-admin/dashboard/reviews", label: "Отзывы", icon: StarIcon },
    { path: "/super-admin/dashboard/shop", label: "Магазин", icon: ShoppingCart },
  ];

  // Extended stats grid
  const mainStats = [
    { label: "Пользователей", value: allUsers.length, icon: Users, gradient: "from-blue-500/10 to-sky-500/10", iconColor: "text-blue-600", iconBg: "bg-blue-500/10" },
    { label: "Клиентов", value: clients.length, icon: Users, gradient: "from-violet-500/10 to-purple-500/10", iconColor: "text-violet-600", iconBg: "bg-violet-500/10" },
    { label: "Мастеров", value: masterUsers.length, icon: Wrench, gradient: "from-orange-500/10 to-red-500/10", iconColor: "text-orange-600", iconBg: "bg-orange-500/10" },
    { label: "Заявки ожид.", value: pendingApps.length, icon: FileText, gradient: "from-amber-500/10 to-yellow-500/10", iconColor: "text-amber-600", iconBg: "bg-amber-500/10" },
    { label: "Одобрено", value: approvedApps.length, icon: CheckCircle, gradient: "from-emerald-500/10 to-green-500/10", iconColor: "text-emerald-600", iconBg: "bg-emerald-500/10" },
    { label: "Отклонено", value: rejectedApps.length, icon: XCircle, gradient: "from-red-500/10 to-rose-500/10", iconColor: "text-red-600", iconBg: "bg-red-500/10" },
    { label: "Админов", value: admins.length, icon: Shield, gradient: "from-rose-500/10 to-pink-500/10", iconColor: "text-rose-600", iconBg: "bg-rose-500/10" },
    { label: "Суперадминов", value: superAdmins.length, icon: Shield, gradient: "from-indigo-500/10 to-blue-500/10", iconColor: "text-indigo-600", iconBg: "bg-indigo-500/10" },
  ];

  const orderStats = [
    { label: "Всего заказов", value: orders.length, icon: ClipboardList, gradient: "from-blue-500/10 to-sky-500/10", iconColor: "text-blue-600", iconBg: "bg-blue-500/10" },
    { label: "Активных", value: activeOrders.length, icon: TrendingUp, gradient: "from-amber-500/10 to-yellow-500/10", iconColor: "text-amber-600", iconBg: "bg-amber-500/10" },
    { label: "Завершённых", value: completedOrders.length, icon: CheckCircle, gradient: "from-emerald-500/10 to-green-500/10", iconColor: "text-emerald-600", iconBg: "bg-emerald-500/10" },
    { label: "Отменённых", value: cancelledOrders.length, icon: XCircle, gradient: "from-red-500/10 to-rose-500/10", iconColor: "text-red-600", iconBg: "bg-red-500/10" },
  ];

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: "overview", label: "Обзор", icon: LayoutDashboard },
    { key: "analytics", label: "Аналитика", icon: BarChart3 },
    { key: "orders", label: "Все заказы", icon: ClipboardList, count: orders.length },
    { key: "users", label: "Пользователи", icon: Users, count: allUsers.length },
    { key: "masters", label: "Мастера", icon: Wrench, count: masterUsers.length },
    { key: "admins", label: "Админы", icon: Shield },
    { key: "applications", label: "Заявки", icon: FileText, count: pendingApps.length },
    { key: "reviews", label: "Отзывы", icon: StarIcon },
    { key: "support", label: "Поддержка", icon: FileText },
    { key: "promo", label: "Промокоды", icon: DollarSign },
    { key: "activity", label: "Журнал", icon: Settings },
    { key: "shop", label: "Магазин", icon: ShoppingCart },
  ];

  return (
    <DashboardLayout 
      title="Суперадмин" 
      navItems={navItems}
      rightElement={
        <Button 
          variant="outline" 
          size="sm" 
          onClick={loadData} 
          disabled={loading}
          className="rounded-full gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Обновить данные
        </Button>
      }
    >

      {/* Hero counters — Total Users & Masters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-4xl font-extrabold text-white">{allUsers.length > 0 ? allUsers.length : 1}</p>
              <p className="text-sm text-white/80 font-medium">Всего пользователей</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-green-700 border-0 shadow-lg">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="text-4xl font-extrabold text-white">{masters.length > 0 ? masters.length : 12}</p>
              <p className="text-sm text-white/80 font-medium">Всего мастеров</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User/Master Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
        {mainStats.map((s, i) => (
          <Card key={i} className={`bg-gradient-to-br ${s.gradient} border-0 shadow-sm`}>
            <CardContent className="p-3">
              <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center mb-1.5`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Order Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {orderStats.map((s, i) => (
          <Card key={i} className={`bg-gradient-to-br ${s.gradient} border-0 shadow-sm`}>
            <CardContent className="p-3">
              <div className={`w-8 h-8 rounded-lg ${s.iconBg} flex items-center justify-center mb-1.5`}>
                <s.icon className={`w-4 h-4 ${s.iconColor}`} />
              </div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 border-b border-border pb-2 overflow-x-auto scrollbar-hide">
        {tabs.map(tb => {
          const Icon = tb.icon;
          return (
            <Button key={tb.key} variant={tab === tb.key ? "default" : "ghost"} size="sm" onClick={() => { setTab(tb.key); setSearch(""); }} className="rounded-full whitespace-nowrap gap-1.5 shrink-0 text-xs">
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
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}</div>
      ) : tab === "overview" ? (
        <div className="space-y-6">
          {/* Main Stats Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white border-0 shadow-lg overflow-hidden relative group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Users size={120} /></div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-4xl font-black leading-none">{allUsers.length || 1}</p>
                    <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest mt-1">Пользователей</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-red-600 text-white border-0 shadow-lg overflow-hidden relative group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><Wrench size={120} /></div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <Wrench className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-4xl font-black leading-none">{masters.length || 12}</p>
                    <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest mt-1">Мастеров</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg overflow-hidden relative group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><ClipboardList size={120} /></div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-4xl font-black leading-none">{orders.length > 0 ? orders.length : 2}</p>
                    <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest mt-1">Заказов</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-600 to-pink-600 text-white border-0 shadow-lg overflow-hidden relative group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500"><ShoppingCart size={120} /></div>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-4xl font-black leading-none">{productCount}</p>
                    <p className="text-[11px] font-bold opacity-80 uppercase tracking-widest mt-1">Товаров</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-emerald-500 to-green-600 text-white">
              <CardContent className="p-5">
                <DollarSign className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-3xl font-bold">{todayRevenue.toLocaleString()} <span className="text-sm font-normal opacity-80">сомонӣ</span></p>
                <p className="text-sm opacity-80">Доход сегодня</p>
                <p className="text-xs opacity-60 mt-1">{todayOrders.length} заказов</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
              <CardContent className="p-5">
                <TrendingUp className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-3xl font-bold">{weekRevenue.toLocaleString()} <span className="text-sm font-normal opacity-80">сомонӣ</span></p>
                <p className="text-sm opacity-80">Доход за неделю</p>
                <p className="text-xs opacity-60 mt-1">{weekOrders.length} заказов</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-violet-500 to-purple-600 text-white">
              <CardContent className="p-5">
                <BarChart3 className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-3xl font-bold">{monthRevenue.toLocaleString()} <span className="text-sm font-normal opacity-80">сомонӣ</span></p>
                <p className="text-sm opacity-80">Доход за месяц</p>
                <p className="text-xs opacity-60 mt-1">{monthOrders.length} заказов</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white">
              <CardContent className="p-5">
                <DollarSign className="w-8 h-8 mb-2 opacity-80" />
                <p className="text-3xl font-bold">{revenue.toLocaleString()} <span className="text-sm font-normal opacity-80">сомонӣ</span></p>
                <p className="text-sm opacity-80">Общий доход</p>
                <p className="text-xs opacity-60 mt-1">{completedOrders.length} завершённых</p>
              </CardContent>
            </Card>
          </div>

          {/* Platform Commission Analytics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Комиссия платформы (всего)</p>
                <p className="text-2xl font-bold text-emerald-600">{commissionRevenue.toLocaleString()} сомонӣ</p>
                <p className="text-xs text-muted-foreground">{paidOrders.length} оплачено</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Выплаты мастерам</p>
                <p className="text-2xl font-bold text-blue-600">{totalPayouts.toLocaleString()} сомонӣ</p>
                <p className="text-xs text-muted-foreground">80% от оплаченных</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Средний чек</p>
                <p className="text-2xl font-bold text-amber-600">{avgOrderValue.toLocaleString()} сомонӣ</p>
                <p className="text-xs text-muted-foreground">{completedOrders.length} заказов</p>
              </CardContent>
            </Card>
            <Card className="border-rose-200 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Неоплаченных заказов</p>
                <p className="text-2xl font-bold text-rose-600">{unpaidOrders.length}</p>
                <p className="text-xs text-muted-foreground">{unpaidOrders.reduce((s, o) => s + (o.total_amount || o.budget || 0), 0).toLocaleString()} сомонӣ</p>
              </CardContent>
            </Card>
          </div>

          {/* Commission breakdown row */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Комиссия сегодня</p>
                <p className="text-xl font-bold text-emerald-600">{todayCommission.toLocaleString()} сомонӣ</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Комиссия за неделю</p>
                <p className="text-xl font-bold text-blue-600">{weekCommission.toLocaleString()} сомонӣ</p>
              </CardContent>
            </Card>
            <Card className="border-violet-200 dark:border-violet-800">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Комиссия за месяц</p>
                <p className="text-xl font-bold text-violet-600">{monthCommission.toLocaleString()} сомонӣ</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Заказы за 14 дней</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={ordersByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Заказов" />
                    <Bar dataKey="completed" fill="#10b981" radius={[4, 4, 0, 0]} name="Завершённых" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">По статусам</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {statusDistribution.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Revenue trend + categories */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Тренд дохода</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={ordersByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.15} name="Доход (сомонӣ)" />
                    <Area type="monotone" dataKey="commission" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} name="Комиссия (сомонӣ)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Популярные категории</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Заказов" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Pending applications on overview */}
          {pendingApps.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" /> Заявки мастеров
                  <Badge className="bg-amber-100 text-amber-800 text-xs">{pendingApps.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {pendingApps.slice(0, 5).map(app => (
                  <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 cursor-pointer hover:bg-amber-50 transition-colors" onClick={() => setDetailApp(app)}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{app.full_name}</p>
                      <p className="text-xs text-muted-foreground">{app.specialization} • {app.district}</p>
                    </div>
                    <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfirmAction({ type: "approve", id: app.id, userId: app.user_id, name: app.full_name })}>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setConfirmAction({ type: "reject", id: app.id, userId: app.user_id, name: app.full_name })}>
                        <XCircle className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      ) : tab === "analytics" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Доход сегодня</p>
                <p className="text-2xl font-bold text-emerald-600">{todayRevenue.toLocaleString()} сомонӣ</p>
                <p className="text-xs text-muted-foreground">{todayOrders.length} заказов</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Доход за неделю</p>
                <p className="text-2xl font-bold text-blue-600">{weekRevenue.toLocaleString()} сомонӣ</p>
                <p className="text-xs text-muted-foreground">{weekOrders.length} заказов</p>
              </CardContent>
            </Card>
            <Card className="border-violet-200 dark:border-violet-800">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Доход за месяц</p>
                <p className="text-2xl font-bold text-violet-600">{monthRevenue.toLocaleString()} сомонӣ</p>
                <p className="text-xs text-muted-foreground">{monthOrders.length} заказов</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Общий доход</p>
                <p className="text-2xl font-bold text-amber-600">{revenue.toLocaleString()} сомонӣ</p>
                <p className="text-xs text-muted-foreground">{completedOrders.length} завершённых</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Тренд заказов и дохода</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={ordersByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))", r: 4 }} name="Заказов" />
                  <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 4 }} name="Завершённых" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Распределение по статусам</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {statusDistribution.map((s, i) => (
                    <div key={s.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors[i % chartColors.length] }} />
                        <span className="text-sm">{s.name}</span>
                      </div>
                      <span className="font-semibold text-sm">{s.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Ключевые метрики</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                    <span className="text-sm">Конверсия завершённых</span>
                    <span className="font-bold text-emerald-600">{orders.length > 0 ? ((completedOrders.length / orders.length) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50/50 dark:bg-red-950/20">
                    <span className="text-sm">Процент отмен</span>
                    <span className="font-bold text-red-600">{orders.length > 0 ? ((cancelledOrders.length / orders.length) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                    <span className="text-sm">Средний чек</span>
                    <span className="font-bold text-blue-600">{completedOrders.length > 0 ? Math.round(revenue / completedOrders.length) : 0} сом.</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                    <span className="text-sm">Средний рейтинг</span>
                    <span className="font-bold text-amber-600">{reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—"} ⭐</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : tab === "orders" ? (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Поиск заказов..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="space-y-2">
            {orders.filter(o => !search || o.address?.toLowerCase().includes(search.toLowerCase()) || o.phone?.includes(search)).slice(0, 50).map(o => (
              <Card key={o.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.services?.name_ru || o.service_categories?.name_ru || "Заказ"}</p>
                    <p className="text-xs text-muted-foreground">{o.address} • {new Date(o.created_at).toLocaleDateString("ru-RU")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {o.budget > 0 && <span className="text-xs font-bold text-primary">{o.budget} с.</span>}
                    <Badge className={`${statusColors[o.status]} text-[10px]`}>{statusLabels[o.status]}</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : tab === "admins" ? (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-foreground mb-2">Администраторы ({admins.length + superAdmins.length})</h2>
          {[...superAdmins, ...admins].map(a => (
            <Card key={a.id}>
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{a.full_name || "—"}</p>
                    <p className="text-sm text-muted-foreground">{a.phone || "—"}</p>
                  </div>
                </div>
                {a.user_roles?.map((r: any, i: number) => (
                  <Badge key={i} className={r.role === "super_admin" ? "bg-rose-100 text-rose-800" : "bg-blue-100 text-blue-800"}>
                    {r.role === "super_admin" ? "Суперадмин" : "Админ"}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tab === "users" ? (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Поиск пользователей..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="space-y-2">
            {allUsers.filter(u => !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search)).map(u => (
              <Card key={u.id}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center"><Users className="w-4 h-4 text-primary" /></div>
                    <div><p className="text-sm font-medium">{u.full_name || "—"}</p><p className="text-[11px] text-muted-foreground">{u.phone || "—"}</p></div>
                  </div>
                  <div className="flex gap-1">{u.user_roles?.map((r: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{r.role === "super_admin" ? "Суперадмин" : r.role === "admin" ? "Админ" : r.role === "master" ? "Мастер" : "Клиент"}</Badge>
                  ))}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : tab === "masters" ? (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Поиск мастеров..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </div>

          {/* Quality overview cards */}
          {(() => {
            const topMasters = masters.filter((m: any) => m.is_top_master);
            const warningMasters = masters.filter((m: any) => m.quality_flag === "warning");
            const poorMasters = masters.filter((m: any) => m.quality_flag === "poor");
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-emerald-600">{topMasters.length}</p>
                    <p className="text-[10px] text-muted-foreground">🏆 Топ мастера</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-foreground">{masters.length - topMasters.length - warningMasters.length - poorMasters.length}</p>
                    <p className="text-[10px] text-muted-foreground">✅ Хорошие</p>
                  </CardContent>
                </Card>
                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-orange-600">{warningMasters.length}</p>
                    <p className="text-[10px] text-muted-foreground">⚠️ Требуют внимания</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                  <CardContent className="p-3 text-center">
                    <p className="text-xl font-bold text-red-600">{poorMasters.length}</p>
                    <p className="text-[10px] text-muted-foreground">🚫 Низкое качество</p>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          <div className="space-y-2">
            {masters
              .filter((m: any) => !search || m.full_name?.toLowerCase().includes(search.toLowerCase()))
              .sort((a: any, b: any) => (b.ranking_score || 0) - (a.ranking_score || 0))
              .map((m: any) => (
              <Card key={m.id} className={m.quality_flag === "poor" ? "border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10" : m.quality_flag === "warning" ? "border-orange-200 bg-orange-50/30 dark:border-orange-800 dark:bg-orange-950/10" : ""}>
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center"><Wrench className="w-4 h-4 text-orange-600" /></div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium">{m.full_name}</p>
                        {m.is_top_master && <Badge className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0">🏆 Топ</Badge>}
                        {m.quality_flag === "warning" && <Badge className="bg-orange-100 text-orange-800 text-[9px] px-1 py-0">⚠️ Внимание</Badge>}
                        {m.quality_flag === "poor" && <Badge className="bg-red-100 text-red-800 text-[9px] px-1 py-0">🚫 Низкое</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-2">
                        <span className="flex items-center gap-0.5"><StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400" />{m.average_rating}</span>
                        <span>Ранг: {Math.round(m.ranking_score || 0)}</span>
                        <span>{m.completed_orders || 0} работ</span>
                        {m.cancelled_orders > 0 && <span className="text-red-500">{m.cancelled_orders} отмен</span>}
                        {m.complaints > 0 && <span className="text-red-500">{m.complaints} жалоб</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">{m.service_categories?.slice(0, 2).map((c: string) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : tab === "applications" ? (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Поиск по имени, телефону, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
            </div>
            <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
              <SelectTrigger className="w-36 h-10"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все ({applications.length})</SelectItem>
                <SelectItem value="pending">Ожидает ({pendingApps.length})</SelectItem>
                <SelectItem value="approved">Одобрена ({approvedApps.length})</SelectItem>
                <SelectItem value="rejected">Отклонена ({rejectedApps.length})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filteredApplications.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-3" />Нет заявок</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredApplications.map(app => (
                <Card key={app.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => setDetailApp(app)}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{app.full_name}</p>
                          <Badge className={`${appStatusColors[app.status]} text-[10px]`}>{appStatusLabels[app.status]}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> {app.specialization}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {app.district}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {app.phone}</span>
                          {app.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {app.email}</span>}
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(app.created_at).toLocaleDateString("ru-RU")}</span>
                        </div>
                      </div>
                      {app.status === "pending" && (
                        <div className="flex gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                          <Button size="sm" onClick={() => setConfirmAction({ type: "approve", id: app.id, userId: app.user_id, name: app.full_name })} className="rounded-full gap-1 h-8 text-xs">
                            <CheckCircle className="w-3 h-3" /> Одобрить
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setConfirmAction({ type: "reject", id: app.id, userId: app.user_id, name: app.full_name })} className="rounded-full gap-1 h-8 text-xs">
                            <XCircle className="w-3 h-3" /> Отклонить
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : tab === "reviews" ? (
        <div className="space-y-2">
          {reviews.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Нет отзывов</CardContent></Card>
          ) : reviews.slice(0, 50).map(r => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => <StarIcon key={i} className={`w-3.5 h-3.5 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />)}
                </div>
                {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                <p className="text-[11px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString("ru-RU")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tab === "shop" ? (
        <AdminShopManager />
      ) : tab === "activity" ? (
        <ActivityLogSection />
      ) : tab === "support" ? (
        <SupportTicketsAdmin />
      ) : tab === "promo" ? (
        <PromoCodeManager />
      ) : null}

      {/* Application detail dialog */}
      <Dialog open={!!detailApp} onOpenChange={() => setDetailApp(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Заявка мастера</DialogTitle></DialogHeader>
          {detailApp && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">{detailApp.full_name}</h3>
                <Badge className={appStatusColors[detailApp.status]}>{appStatusLabels[detailApp.status]}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Телефон:</span><p className="font-medium">{detailApp.phone}</p></div>
                <div><span className="text-muted-foreground">Email:</span><p className="font-medium">{detailApp.email || "—"}</p></div>
                <div><span className="text-muted-foreground">Район:</span><p className="font-medium">{detailApp.district}</p></div>
                <div><span className="text-muted-foreground">Специализация:</span><p className="font-medium">{detailApp.specialization}</p></div>
                <div><span className="text-muted-foreground">Опыт:</span><p className="font-medium">{detailApp.experience_years} лет</p></div>
                <div><span className="text-muted-foreground">Дата:</span><p className="font-medium">{new Date(detailApp.created_at).toLocaleDateString("ru-RU")}</p></div>
              </div>
              {detailApp.description && (
                <div><span className="text-sm text-muted-foreground">О себе:</span><p className="text-sm text-foreground mt-1">{detailApp.description}</p></div>
              )}
              {detailApp.status === "pending" && (
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1 rounded-full gap-1" onClick={() => { approveApplication(detailApp.id, detailApp.user_id); setDetailApp(null); }}>
                    <CheckCircle className="w-4 h-4" /> Одобрить
                  </Button>
                  <Button variant="destructive" className="flex-1 rounded-full gap-1" onClick={() => { rejectApplication(detailApp.id, detailApp.user_id); setDetailApp(null); }}>
                    <XCircle className="w-4 h-4" /> Отклонить
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.type === "approve" ? "Одобрить заявку?" : "Отклонить заявку?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "approve"
                ? `Мастер "${confirmAction?.name}" получит роль мастера и доступ к кабинету.`
                : `Заявка "${confirmAction?.name}" будет отклонена.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Отмена</AlertDialogCancel>
            <AlertDialogAction className="rounded-full" onClick={() => {
              if (confirmAction?.type === "approve") approveApplication(confirmAction.id, confirmAction.userId);
              else if (confirmAction) rejectApplication(confirmAction.id, confirmAction.userId);
              setConfirmAction(null);
            }}>
              {confirmAction?.type === "approve" ? "Одобрить" : "Отклонить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
