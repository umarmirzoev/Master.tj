import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  LayoutDashboard, ClipboardList, Users, UserCheck, Wrench, Star as StarIcon,
  Search, DollarSign, CheckCircle, XCircle, TrendingUp, Eye, MapPin, Phone,
  Calendar, ArrowRight, Filter, FileText, Mail, ShoppingCart, BarChart3,
  HelpCircle, Tag,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { getLocalShopOrders, mergeShopOrders, updateLocalShopOrderStatus } from "@/lib/localShopOrders";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PaymentStatusBadge } from "@/components/payment/PaymentComponents";
import AdminShopManager from "./AdminShopManager";
import PromoCodeManager from "./PromoCodeManager";
import SupportTicketsAdmin from "./SupportTicketsAdmin";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
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
  new: "Новый",
  accepted: "Принят",
  assigned: "Назначен",
  on_the_way: "В пути",
  arrived: "Прибыл",
  in_progress: "В работе",
  completed: "Завершён",
  reviewed: "Оценён",
  cancelled: "Отменён",
};

const appStatusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};
const appStatusLabels: Record<string, string> = {
  pending: "Ожидает",
  approved: "Одобрена",
  rejected: "Отклонена",
};

const statusFlow = ["new", "accepted", "assigned", "on_the_way", "arrived", "in_progress", "completed", "cancelled"];
const chartColors = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];

type Tab = "overview" | "analytics" | "orders" | "applications" | "users" | "masters" | "reviews" | "shop" | "support" | "promo";

const ADMIN_TAB_BY_PATH: Record<string, Tab> = {
  "/admin/dashboard": "overview",
  "/admin/dashboard/analytics": "analytics",
  "/admin/dashboard/orders": "orders",
  "/admin/dashboard/applications": "applications",
  "/admin/dashboard/users": "users",
  "/admin/dashboard/masters": "masters",
  "/admin/dashboard/reviews": "reviews",
  "/admin/dashboard/shop": "shop",
  "/admin/dashboard/support": "support",
  "/admin/dashboard/promo": "promo",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>(ADMIN_TAB_BY_PATH[location.pathname] || "overview");
  const [orders, setOrders] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [masters, setMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [appStatusFilter, setAppStatusFilter] = useState("all");
  const [appSpecFilter, setAppSpecFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; userId: string; name: string } | null>(null);

  // Assign master dialog
  const [assignDialog, setAssignDialog] = useState<any>(null);
  const [selectedMasterId, setSelectedMasterId] = useState("");

  // Order detail
  const [detailOrder, setDetailOrder] = useState<any>(null);
  // Application detail
  const [detailApp, setDetailApp] = useState<any>(null);

  useEffect(() => {
    setTab(ADMIN_TAB_BY_PATH[location.pathname] || "overview");
  }, [location.pathname]);

  const loadData = async () => {
    setLoading(true);
    const [ordersRes, usersRes, catsRes, appsRes, reviewsRes, mastersRes, shopOrdersRes] = await Promise.all([
      supabase.from("orders").select("*, service_categories(name_ru), services(name_ru)").order("created_at", { ascending: false }).limit(500),
      supabase.from("profiles").select("*, user_roles(role)").limit(500),
      supabase.from("service_categories").select("*, services(count)").order("sort_order"),
      supabase.from("master_applications").select("*").order("created_at", { ascending: false }),
      supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("master_listings").select("id, full_name, phone, service_categories, average_rating, user_id, working_districts, ranking_score, is_top_master, quality_flag, completed_orders").eq("is_active", true).order("ranking_score", { ascending: false }).limit(200),
      supabase.from("shop_orders").select("id, status, created_at, total, customer_name, phone, delivery_address, payment_status").order("created_at", { ascending: false }).limit(500),
    ]);
    setOrders(ordersRes.data || []);
    setAllUsers(usersRes.data || []);
    setCategories(catsRes.data || []);
    setApplications(appsRes.data || []);
    setReviews(reviewsRes.data || []);
    setMasters(mastersRes.data || []);
    setShopOrders(
      mergeShopOrders((shopOrdersRes.data || []) as any[], getLocalShopOrders() as any[]),
    );
    setLoading(false);
  };

  const [shopOrders, setShopOrders] = useState<any[]>([]);

  useEffect(() => { loadData(); }, []);
  useRealtimeOrders({ userId: user?.id, role: "admin", onUpdate: loadData });

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "mc_local_shop_orders" || event.key === "mc_fallback_orders") {
        void loadData();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const updateData: any = { status };
    if (status === "accepted") updateData.accepted_at = new Date().toISOString();
    if (status === "in_progress") updateData.started_at = new Date().toISOString();
    if (status === "completed") updateData.completed_at = new Date().toISOString();
    const { error } = await supabase.from("orders").update(updateData).eq("id", orderId);
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updateData } : o));
      toast({ title: "Статус обновлён" });
      const order = orders.find(o => o.id === orderId);
      if (order) {
        const statusMessages: Record<string, string> = {
          accepted: "Ваш заказ принят администратором",
          assigned: "К вашему заказу назначен мастер",
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
      }
    }
  };

  const updateShopOrderStatus = async (orderId: string, status: string) => {
    let error = null;

    if (orderId.startsWith("local-shop-")) {
      updateLocalShopOrderStatus(orderId, status);
    } else {
      const result = await supabase.from("shop_orders").update({ status }).eq("id", orderId);
      error = result.error;
    }

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Статус заказа магазина обновлен" });
    loadData();
  };

  const assignMaster = async () => {
    if (!assignDialog || !selectedMasterId) return;
    const { error } = await supabase.from("orders").update({
      master_id: selectedMasterId, status: "assigned",
    }).eq("id", assignDialog.id);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Мастер назначен" });
      // Notify both client and master
      await Promise.all([
        supabase.from("notifications").insert({
          user_id: assignDialog.client_id, title: "Мастер назначен",
          message: "К вашему заказу назначен мастер", type: "order_status", related_id: assignDialog.id,
        }),
        supabase.from("notifications").insert({
          user_id: selectedMasterId, title: "Новый заказ назначен",
          message: `Вам назначен новый заказ по адресу: ${assignDialog.address || "—"}`,
          type: "order_assigned", related_id: assignDialog.id,
        }),
      ]);
      loadData();
    }
    setAssignDialog(null);
    setSelectedMasterId("");
  };

  const approveApplication = async (appId: string, userId: string) => {
    const app = applications.find(a => a.id === appId);
    await supabase.from("master_applications").update({ status: "approved" }).eq("id", appId);
    const { data: existingRole } = await supabase.from("user_roles").select("id").eq("user_id", userId).eq("role", "master");
    if (!existingRole || existingRole.length === 0) {
      await supabase.from("user_roles").insert({ user_id: userId, role: "master" as any });
    }
    await supabase.from("profiles").update({
      approval_status: "approved",
      service_categories: app ? [app.specialization] : [],
      experience_years: app?.experience_years || 0,
      working_districts: app ? [app.district] : [],
    }).eq("user_id", userId);
    const { data: existingListing } = await supabase.from("master_listings").select("id").eq("user_id", userId).limit(1);
    if (!existingListing || existingListing.length === 0) {
      await supabase.from("master_listings").insert({
        user_id: userId, full_name: app?.full_name || "", phone: app?.phone || "",
        service_categories: app ? [app.specialization] : [],
        working_districts: app ? [app.district] : [],
        experience_years: app?.experience_years || 0,
        bio: app?.description || "", is_active: true,
      });
    }
    await supabase.from("notifications").insert({
      user_id: userId, title: "Заявка одобрена!",
      message: "Ваша заявка мастера одобрена. Теперь вы можете работать как мастер.",
      type: "application",
    });
    toast({ title: "Заявка одобрена" });
    loadData();
  };

  const rejectApplication = async (appId: string, userId: string) => {
    await supabase.from("master_applications").update({ status: "rejected" }).eq("id", appId);
    await supabase.from("notifications").insert({
      user_id: userId, title: "Заявка отклонена",
      message: "К сожалению, ваша заявка мастера была отклонена.",
      type: "application",
    });
    toast({ title: "Заявка отклонена" });
    loadData();
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (categoryFilter !== "all" && o.category_id !== categoryFilter) return false;
      if (paymentFilter !== "all" && (o as any).payment_status !== paymentFilter) return false;
      if (search && tab === "orders") {
        const q = search.toLowerCase();
        if (!o.address?.toLowerCase().includes(q) && !o.phone?.includes(q) && !o.services?.name_ru?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [orders, statusFilter, categoryFilter, paymentFilter, search, tab]);

  // Filtered applications
  const filteredApplications = useMemo(() => {
    return applications.filter(a => {
      if (appStatusFilter !== "all" && a.status !== appStatusFilter) return false;
      if (appSpecFilter !== "all" && a.specialization !== appSpecFilter) return false;
      if (search && tab === "applications") {
        const q = search.toLowerCase();
        if (!a.full_name?.toLowerCase().includes(q) && !a.phone?.includes(q) && !a.email?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [applications, appStatusFilter, appSpecFilter, search, tab]);

  // Filtered users with role filter
  const filteredUsers = useMemo(() => {
    return allUsers.filter(u => {
      if (userRoleFilter !== "all") {
        const hasMatchingRole = u.user_roles?.some((r: any) => r.role === userRoleFilter);
        if (!hasMatchingRole) return false;
      }
      if (search && tab === "users") {
        const q = search.toLowerCase();
        if (!u.full_name?.toLowerCase().includes(q) && !u.phone?.includes(q) && !u.user_id?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [allUsers, userRoleFilter, search, tab]);

  const pendingApps = applications.filter(a => a.status === "pending");
  const newOrders = orders.filter(o => o.status === "new" || o.status === "pending");
  const pendingShopOrders = shopOrders.filter(o => o.status === "pending");
  const activeOrders = orders.filter(o => !["completed", "cancelled", "reviewed"].includes(o.status));
  const completedOrds = orders.filter(o => o.status === "completed" || o.status === "reviewed");
  const cancelledOrders = orders.filter(o => o.status === "cancelled");

  const clientUsers = allUsers.filter(u => u.user_roles?.some((r: any) => r.role === "client"));
  const masterUsers = allUsers.filter(u => u.user_roles?.some((r: any) => r.role === "master"));

  // Analytics calculations
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 86400000);
  const monthAgo = new Date(today.getTime() - 30 * 86400000);

  const COMMISSION_RATE = 0.2;
  const revenue = completedOrds.reduce((s, o) => s + (o.total_amount || o.budget || 0), 0);
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);
  const weekOrders = orders.filter(o => new Date(o.created_at) >= weekAgo);

  // Charts data
  const ordersByDay = useMemo(() => {
    const days: { date: string; orders: number; completed: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      const dateStr = d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
      const dayOrders = orders.filter(o => new Date(o.created_at).toDateString() === d.toDateString());
      const dayCompleted = dayOrders.filter(o => o.status === "completed" || o.status === "reviewed");
      days.push({ date: dateStr, orders: dayOrders.length, completed: dayCompleted.length });
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

  const getClientName = (clientId: string) => {
    const u = allUsers.find(u => u.user_id === clientId);
    return u?.full_name || "—";
  };

  const getUserRole = (u: any) => {
    const roles = u.user_roles?.map((r: any) => r.role) || [];
    if (roles.includes("super_admin")) return "Суперадмин";
    if (roles.includes("admin")) return "Админ";
    if (roles.includes("master")) return "Мастер";
    return "Клиент";
  };

  const getUserRoleBadgeClass = (u: any) => {
    const roles = u.user_roles?.map((r: any) => r.role) || [];
    if (roles.includes("super_admin")) return "bg-indigo-100 text-indigo-800";
    if (roles.includes("admin")) return "bg-rose-100 text-rose-800";
    if (roles.includes("master")) return "bg-orange-100 text-orange-800";
    return "bg-blue-100 text-blue-800";
  };

  // Unique specializations from applications for filter
  const specOptions = useMemo(() => {
    const specs = new Set(applications.map(a => a.specialization).filter(Boolean));
    return Array.from(specs);
  }, [applications]);

  const unifiedNewOrders = useMemo(() => {
    const serviceItems = newOrders.map((order) => ({
      id: order.id,
      kind: "service" as const,
      created_at: order.created_at,
      title: order.services?.name_ru || order.service_categories?.name_ru || "Заказ услуги",
      subtitle: getClientName(order.client_id),
      meta: order.address || "Без адреса",
      phone: order.phone || "Без телефона",
      amount: order.total_amount || order.budget || 0,
      raw: order,
    }));

    const shopItems = pendingShopOrders.map((order) => ({
      id: order.id,
      kind: "shop" as const,
      created_at: order.created_at,
      title: "Заказ товара",
      subtitle: order.customer_name || "Клиент магазина",
      meta: order.delivery_address || "Без адреса",
      phone: order.phone || "Без телефона",
      amount: order.total || 0,
      raw: order,
    }));

    return [...serviceItems, ...shopItems]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [newOrders, pendingShopOrders, allUsers]);

  const navItems = [
    { path: "/admin/dashboard", label: "Панель", icon: LayoutDashboard },
    { path: "/admin/dashboard/orders", label: "Заказы", icon: ClipboardList, badge: unifiedNewOrders.length },
    { path: "/admin/dashboard/users", label: "Пользователи", icon: Users },
    { path: "/admin/dashboard/masters", label: "Мастера", icon: Wrench },
    { path: "/admin/dashboard/applications", label: "Заявки", icon: FileText, badge: pendingApps.length },
    { path: "/admin/dashboard/reviews", label: "Отзывы", icon: StarIcon },
    { path: "/admin/dashboard/shop", label: "Магазин", icon: ShoppingCart, badge: pendingShopOrders.length },
  ];

  const stats = [
    { label: "Пользователей", value: allUsers.length, icon: Users, gradient: "from-blue-500/10 to-sky-500/10", iconColor: "text-blue-600", iconBg: "bg-blue-500/10" },
    { label: "Клиентов", value: clientUsers.length, icon: Users, gradient: "from-violet-500/10 to-purple-500/10", iconColor: "text-violet-600", iconBg: "bg-violet-500/10" },
    { label: "Мастеров", value: masters.length, icon: Wrench, gradient: "from-orange-500/10 to-red-500/10", iconColor: "text-orange-600", iconBg: "bg-orange-500/10" },
    { label: "Новых", value: unifiedNewOrders.length, icon: ClipboardList, gradient: "from-blue-500/10 to-sky-500/10", iconColor: "text-blue-600", iconBg: "bg-blue-500/10" },
    { label: "Активных", value: activeOrders.length, icon: TrendingUp, gradient: "from-amber-500/10 to-yellow-500/10", iconColor: "text-amber-600", iconBg: "bg-amber-500/10" },
    { label: "Завершённых", value: completedOrds.length, icon: CheckCircle, gradient: "from-emerald-500/10 to-green-500/10", iconColor: "text-emerald-600", iconBg: "bg-emerald-500/10" },
    { label: "Отменённых", value: cancelledOrders.length, icon: XCircle, gradient: "from-red-500/10 to-rose-500/10", iconColor: "text-red-600", iconBg: "bg-red-500/10" },
    { label: "Заявки ожид.", value: pendingApps.length, icon: FileText, gradient: "from-rose-500/10 to-pink-500/10", iconColor: "text-rose-600", iconBg: "bg-rose-500/10" },
    { label: "Заказов магаз.", value: shopOrders.length, icon: ShoppingCart, gradient: "from-violet-500/10 to-purple-500/10", iconColor: "text-violet-600", iconBg: "bg-violet-500/10" },
  ];

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: "overview", label: "Обзор", icon: LayoutDashboard },
    { key: "analytics", label: "Аналитика", icon: BarChart3 },
    { key: "orders", label: "Заказы", icon: ClipboardList, count: unifiedNewOrders.length },
    { key: "applications", label: "Заявки мастеров", icon: FileText, count: pendingApps.length },
    { key: "users", label: "Пользователи", icon: Users, count: allUsers.length },
    { key: "masters", label: "Мастера", icon: Wrench },
    { key: "reviews", label: "Отзывы", icon: StarIcon },
    { key: "support", label: "Поддержка", icon: HelpCircle },
    { key: "promo", label: "Промокоды", icon: Tag },
    { key: "shop", label: "Магазин", icon: ShoppingCart, count: shopOrders.length },
  ];

  return (
    <DashboardLayout title="Админ панель" navItems={navItems}>
      {/* Hero counters */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 shadow-lg">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">{allUsers.length}</p>
              <p className="text-sm text-white/80 font-medium">Всего пользователей</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-600 to-green-700 border-0 shadow-lg">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-3xl font-extrabold text-white">{orders.length}</p>
              <p className="text-sm text-white/80 font-medium">Всего заказов</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        {stats.map((s, i) => (
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
            <Button key={tb.key} variant={tab === tb.key ? "default" : "ghost"} size="sm" onClick={() => { setTab(tb.key); setSearch(""); navigate(Object.entries(ADMIN_TAB_BY_PATH).find(([, value]) => value === tb.key)?.[0] || "/admin/dashboard"); }} className="rounded-full whitespace-nowrap gap-1.5 shrink-0 text-xs">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* New orders */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-blue-600" /> Новые заказы
                {newOrders.length > 0 && <Badge className="bg-blue-100 text-blue-800 text-xs">{newOrders.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {newOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет новых заказов</p>
              ) : newOrders.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer" onClick={() => setDetailOrder(o)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.services?.name_ru || o.service_categories?.name_ru || "Заказ"}</p>
                    <p className="text-xs text-muted-foreground">{o.address} • {new Date(o.created_at).toLocaleDateString("ru-RU")}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" className="h-7 text-xs rounded-full" onClick={e => { e.stopPropagation(); updateOrderStatus(o.id, "accepted"); }}>Принять</Button>
                    <Button size="sm" variant="destructive" className="h-7 text-xs rounded-full" onClick={e => { e.stopPropagation(); updateOrderStatus(o.id, "cancelled"); }}>Отклонить</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pending applications */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" /> Заявки мастеров
                {pendingApps.length > 0 && <Badge className="bg-amber-100 text-amber-800 text-xs">{pendingApps.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pendingApps.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Нет новых заявок</p>
              ) : pendingApps.slice(0, 5).map(app => (
                <div key={app.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer" onClick={() => setDetailApp(app)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{app.full_name}</p>
                    <p className="text-xs text-muted-foreground">{app.specialization} • {app.district}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setConfirmAction({ type: "approve", id: app.id, userId: app.user_id, name: app.full_name }); }}>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={e => { e.stopPropagation(); setConfirmAction({ type: "reject", id: app.id, userId: app.user_id, name: app.full_name }); }}>
                      <XCircle className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
              {pendingApps.length > 5 && (
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setTab("applications")}>
                  Показать все ({pendingApps.length}) <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Active orders */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Активные заказы
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeOrders.slice(0, 5).map(o => (
                <div key={o.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors" onClick={() => setDetailOrder(o)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{o.services?.name_ru || "Заказ"}</p>
                    <p className="text-xs text-muted-foreground">{getClientName(o.client_id)}</p>
                  </div>
                  <Badge className={`${statusColors[o.status]} text-[10px] shrink-0`}>{statusLabels[o.status]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick stats summary */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Заказы за 14 дней
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ordersByDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip />
                  <Bar dataKey="orders" fill="hsl(var(--primary))" name="Заказы" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#10b981" name="Завершено" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : tab === "analytics" ? (
        <div className="space-y-6">
          {/* Revenue summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-0">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Общий оборот</p>
                <p className="text-xl font-bold text-foreground">{revenue.toLocaleString()} с.</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-500/10 to-sky-500/10 border-0">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Заказов сегодня</p>
                <p className="text-xl font-bold text-foreground">{todayOrders.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-amber-500/10 to-yellow-500/10 border-0">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Заказов за неделю</p>
                <p className="text-xl font-bold text-foreground">{weekOrders.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-0">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Отзывов</p>
                <p className="text-xl font-bold text-foreground">{reviews.length}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Orders chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Заказы за 14 дней</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={ordersByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="orders" stroke="hsl(var(--primary))" strokeWidth={2} name="Все" />
                    <Line type="monotone" dataKey="completed" stroke="#10b981" strokeWidth={2} name="Завершено" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Status distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Статусы заказов</CardTitle>
              </CardHeader>
              <CardContent>
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={statusDistribution} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {statusDistribution.map((_, i) => <Cell key={i} fill={chartColors[i % chartColors.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-12">Нет данных</p>}
              </CardContent>
            </Card>

            {/* Category distribution */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Популярность категорий</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryDistribution} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" fontSize={10} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis type="category" dataKey="name" width={120} fontSize={11} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="hsl(var(--primary))" name="Заказов" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="text-center text-muted-foreground py-12">Нет данных</p>}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : tab === "orders" ? (
        <>
          {unifiedNewOrders.length > 0 && (
            <Card className="mb-4 border-primary/20 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Все новые заказы
                  <Badge className="bg-primary/10 text-primary text-xs">{unifiedNewOrders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unifiedNewOrders.slice(0, 8).map((order) => (
                  <div
                    key={`${order.kind}-${order.id}`}
                    className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-foreground truncate">{order.title}</p>
                        <Badge variant="secondary" className="text-[10px]">
                          {order.kind === "shop" ? "Магазин" : "Услуга"}
                        </Badge>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{order.subtitle}</span>
                        <span>{order.phone}</span>
                        <span className="truncate">{order.meta}</span>
                        <span>{new Date(order.created_at).toLocaleDateString("ru-RU")}</span>
                        {order.amount > 0 && <span className="font-semibold text-primary">{order.amount.toLocaleString()} с.</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      {order.kind === "service" ? (
                        <>
                          <Button size="sm" className="rounded-full" onClick={() => updateOrderStatus(order.id, "accepted")}>
                            Принять
                          </Button>
                          <Button size="sm" variant="destructive" className="rounded-full" onClick={() => updateOrderStatus(order.id, "cancelled")}>
                            Отклонить
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setDetailOrder(order.raw)}>
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Детали
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" className="rounded-full" onClick={() => updateShopOrderStatus(order.id, "confirmed")}>
                            Подтвердить
                          </Button>
                          <Button size="sm" variant="destructive" className="rounded-full" onClick={() => updateShopOrderStatus(order.id, "cancelled")}>
                            Отклонить
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-full" onClick={() => navigate("/admin/dashboard/shop")}>
                            <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                            В магазин
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Поиск по адресу, телефону..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-10"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40 h-10"><SelectValue placeholder="Категория" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ru}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-36 h-10"><SelectValue placeholder="Оплата" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="paid">Оплачен</SelectItem>
                <SelectItem value="unpaid">Не оплачен</SelectItem>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="failed">Ошибка</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {newOrders.length > 0 && (
            <Card className="mb-4 border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  Новые заказы
                  <Badge className="bg-blue-100 text-blue-800 text-xs">{newOrders.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {newOrders.slice(0, 6).map((order) => (
                  <div
                    key={order.id}
                    className="flex flex-col gap-3 rounded-xl border border-blue-100 bg-background/90 p-3 md:flex-row md:items-center md:justify-between dark:border-blue-900/60"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {order.services?.name_ru || order.service_categories?.name_ru || "Заказ"}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{getClientName(order.client_id)}</span>
                        <span>{order.phone || "Без телефона"}</span>
                        <span className="truncate">{order.address || "Без адреса"}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="rounded-full"
                        onClick={() => updateOrderStatus(order.id, "accepted")}
                      >
                        Принять
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => updateOrderStatus(order.id, "cancelled")}
                      >
                        Отклонить
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => setDetailOrder(order)}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Детали
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="space-y-2">
            <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span className="col-span-3">Услуга</span>
              <span className="col-span-2">Клиент</span>
              <span className="col-span-2">Адрес</span>
              <span className="col-span-1">Дата</span>
              <span className="col-span-2">Статус</span>
              <span className="col-span-2">Действия</span>
            </div>
            {filteredOrders.map(order => (
              <Card key={order.id} className="hover:shadow-md transition-all">
                <CardContent className="p-3 md:p-4">
                  <div className="md:grid md:grid-cols-12 md:gap-3 md:items-center space-y-2 md:space-y-0">
                    <div className="col-span-3 min-w-0">
                      <p className="font-medium text-sm truncate">{order.services?.name_ru || order.service_categories?.name_ru || "Заказ"}</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] text-muted-foreground">ID: {order.id.slice(0, 8)}</p>
                        {(order.total_amount || order.budget) > 0 && <span className="text-[10px] font-semibold text-primary">{(order.total_amount || order.budget || 0).toLocaleString()} с.</span>}
                        <PaymentStatusBadge status={(order as any).payment_status || "unpaid"} />
                      </div>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <p className="text-sm truncate">{getClientName(order.client_id)}</p>
                      <p className="text-[11px] text-muted-foreground">{order.phone}</p>
                    </div>
                    <div className="col-span-2 min-w-0"><p className="text-sm truncate">{order.address}</p></div>
                    <div className="col-span-1"><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ru-RU")}</p></div>
                    <div className="col-span-2">
                      <Select value={order.status} onValueChange={v => updateOrderStatus(order.id, v)}>
                        <SelectTrigger className="h-8 text-xs">
                          <Badge className={`${statusColors[order.status]} text-[10px]`}>{statusLabels[order.status]}</Badge>
                        </SelectTrigger>
                        <SelectContent>{statusFlow.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 text-xs rounded-full" onClick={() => setDetailOrder(order)}>
                        <Eye className="w-3 h-3 mr-1" /> Детали
                      </Button>
                      {!order.master_id && order.status !== "cancelled" && (
                        <Button size="sm" className="h-7 text-xs rounded-full" onClick={() => setAssignDialog(order)}>Назначить</Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : tab === "applications" ? (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Поиск по имени, телефону, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
            </div>
            <Select value={appStatusFilter} onValueChange={setAppStatusFilter}>
              <SelectTrigger className="w-36 h-10"><SelectValue placeholder="Статус" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                <SelectItem value="pending">Ожидает</SelectItem>
                <SelectItem value="approved">Одобрена</SelectItem>
                <SelectItem value="rejected">Отклонена</SelectItem>
              </SelectContent>
            </Select>
            <Select value={appSpecFilter} onValueChange={setAppSpecFilter}>
              <SelectTrigger className="w-44 h-10"><SelectValue placeholder="Специализация" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все специализации</SelectItem>
                {specOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {filteredApplications.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><FileText className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />Нет заявок</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {filteredApplications.map(app => (
                <Card key={app.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => setDetailApp(app)}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">{app.full_name || "—"}</p>
                          <Badge className={`${appStatusColors[app.status]} text-[10px]`}>{appStatusLabels[app.status]}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> {app.specialization}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {app.district}</span>
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {app.phone}</span>
                          {app.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {app.email}</span>}
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(app.created_at).toLocaleDateString("ru-RU")}</span>
                          {app.experience_years > 0 && <span>Опыт: {app.experience_years} лет</span>}
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
      ) : tab === "users" ? (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Поиск по имени, телефону..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
            </div>
            <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
              <SelectTrigger className="w-40 h-10"><SelectValue placeholder="Роль" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все роли</SelectItem>
                <SelectItem value="client">Клиенты</SelectItem>
                <SelectItem value="master">Мастера</SelectItem>
                <SelectItem value="admin">Админы</SelectItem>
                <SelectItem value="super_admin">Суперадмины</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Показано: {filteredUsers.length} из {allUsers.length}</p>
          <div className="space-y-2">
            {filteredUsers.map(u => (
              <Card key={u.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground truncate">{u.full_name || "—"}</p>
                        <Badge className={`${getUserRoleBadgeClass(u)} text-[10px]`}>{getUserRole(u)}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                        {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {u.phone}</span>}
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(u.created_at).toLocaleDateString("ru-RU")}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : tab === "masters" ? (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Поиск мастеров..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <div className="space-y-2">
            {masters.filter(m => !search || m.full_name?.toLowerCase().includes(search.toLowerCase())).map(m => (
              <Card key={m.id}>
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{m.full_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <StarIcon className="w-3 h-3 fill-yellow-400 text-yellow-400" /> {m.average_rating}
                        <span>• {m.phone}</span>
                        <span>• {m.completed_orders || 0} работ</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">{m.service_categories?.slice(0, 2).map((c: string) => <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : tab === "reviews" ? (
        <div className="space-y-2">
          {reviews.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Нет отзывов</CardContent></Card>
          ) : reviews.map(r => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <StarIcon key={i} className={`w-4 h-4 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                {r.comment && <p className="text-sm text-foreground">{r.comment}</p>}
                <p className="text-xs text-muted-foreground mt-1">{new Date(r.created_at).toLocaleDateString("ru-RU")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tab === "shop" ? (
        <AdminShopManager />
      ) : tab === "support" ? (
        <SupportTicketsAdmin />
      ) : tab === "promo" ? (
        <PromoCodeManager />
      ) : null}

      {/* Order detail dialog */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Детали заказа</DialogTitle></DialogHeader>
          {detailOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Услуга:</span><p className="font-medium">{detailOrder.services?.name_ru || "—"}</p></div>
                <div><span className="text-muted-foreground">Категория:</span><p className="font-medium">{detailOrder.service_categories?.name_ru || "—"}</p></div>
                <div><span className="text-muted-foreground">Клиент:</span><p className="font-medium">{getClientName(detailOrder.client_id)}</p></div>
                <div><span className="text-muted-foreground">Телефон:</span><p className="font-medium">{detailOrder.phone}</p></div>
                <div><span className="text-muted-foreground">Адрес:</span><p className="font-medium">{detailOrder.address}</p></div>
                <div><span className="text-muted-foreground">Дата:</span><p className="font-medium">{new Date(detailOrder.created_at).toLocaleDateString("ru-RU")}</p></div>
                <div className="col-span-2"><span className="text-muted-foreground">Описание:</span><p className="font-medium">{detailOrder.description || "—"}</p></div>
              </div>

              {/* Financial breakdown */}
              {(detailOrder.total_amount > 0 || detailOrder.budget > 0) && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-4 space-y-2">
                    <p className="text-sm font-semibold text-foreground mb-2">💰 Финансы</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Сумма заказа</span>
                      <span className="font-medium">{(detailOrder.total_amount || detailOrder.budget || 0).toLocaleString()} сомонӣ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Комиссия (20%)</span>
                      <span className="font-medium text-amber-600">{((detailOrder as any).platform_commission || Math.round((detailOrder.total_amount || detailOrder.budget || 0) * 0.2)).toLocaleString()} сомонӣ</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Выплата мастеру</span>
                      <span className="font-medium text-emerald-600">{((detailOrder as any).master_payout || Math.round((detailOrder.total_amount || detailOrder.budget || 0) * 0.8)).toLocaleString()} сомонӣ</span>
                    </div>
                    <div className="flex justify-between text-sm pt-1 border-t border-border">
                      <span className="text-muted-foreground">Статус оплаты</span>
                      <PaymentStatusBadge status={(detailOrder as any).payment_status || "unpaid"} />
                    </div>
                    {(detailOrder as any).payout_status && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Статус выплаты</span>
                        <Badge className={(detailOrder as any).payout_status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>
                          {(detailOrder as any).payout_status === "paid" ? "Выплачено" : "Ожидает"}
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div>
                <span className="text-sm text-muted-foreground">Статус:</span>
                <Select value={detailOrder.status} onValueChange={v => { updateOrderStatus(detailOrder.id, v); setDetailOrder({ ...detailOrder, status: v }); }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{statusFlow.map(s => <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {!detailOrder.master_id && detailOrder.status !== "cancelled" && (
                  <Button className="flex-1 rounded-full" onClick={() => { setAssignDialog(detailOrder); setDetailOrder(null); }}>Назначить мастера</Button>
                )}
                {detailOrder.status === "new" && (
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-full"
                    onClick={() => {
                      updateOrderStatus(detailOrder.id, "cancelled");
                      setDetailOrder({ ...detailOrder, status: "cancelled" });
                    }}
                  >
                    Отклонить заказ
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <div><span className="text-muted-foreground">Дата подачи:</span><p className="font-medium">{new Date(detailApp.created_at).toLocaleDateString("ru-RU")}</p></div>
              </div>
              {detailApp.description && (
                <div>
                  <span className="text-sm text-muted-foreground">О себе:</span>
                  <p className="text-sm text-foreground mt-1">{detailApp.description}</p>
                </div>
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

      {/* Assign master dialog — Smart Recommendation */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Назначить мастера</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground mb-1">
            Заказ: {assignDialog?.services?.name_ru || assignDialog?.service_categories?.name_ru || "—"}
          </p>
          {assignDialog?.address && <p className="text-xs text-muted-foreground mb-3">📍 {assignDialog.address}</p>}
          
          {/* Recommended masters section */}
          {(() => {
            const orderCat = assignDialog?.service_categories?.name_ru;
            const recommended = masters
              .filter((m: any) => {
                if (m.quality_flag === "poor") return false;
                if (orderCat && m.service_categories?.includes(orderCat)) return true;
                return true;
              })
              .sort((a: any, b: any) => {
                const aMatch = orderCat && a.service_categories?.includes(orderCat) ? 1 : 0;
                const bMatch = orderCat && b.service_categories?.includes(orderCat) ? 1 : 0;
                if (aMatch !== bMatch) return bMatch - aMatch;
                return (b.ranking_score || 0) - (a.ranking_score || 0);
              })
              .slice(0, 5);
            
            return recommended.length > 0 ? (
              <div className="mb-3">
                <p className="text-xs font-semibold text-primary mb-2">⚡ Рекомендуемые мастера</p>
                <div className="space-y-1.5">
                  {recommended.map((m: any) => (
                    <div
                      key={m.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${selectedMasterId === (m.user_id || m.id) ? "bg-primary/10 border border-primary/30" : "bg-muted/50 hover:bg-muted"}`}
                      onClick={() => setSelectedMasterId(m.user_id || m.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {m.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-sm font-medium truncate">{m.full_name}</p>
                            {m.is_top_master && <Badge className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0">Топ</Badge>}
                            {m.quality_flag === "warning" && <Badge className="bg-orange-100 text-orange-800 text-[9px] px-1 py-0">⚠</Badge>}
                          </div>
                          <p className="text-[10px] text-muted-foreground">★{m.average_rating} · {m.completed_orders || 0} работ · Ранг: {Math.round(m.ranking_score || 0)}</p>
                        </div>
                      </div>
                      {selectedMasterId === (m.user_id || m.id) && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                    </div>
                  ))}
                </div>
              </div>
            ) : null;
          })()}

          <Select value={selectedMasterId} onValueChange={setSelectedMasterId}>
            <SelectTrigger><SelectValue placeholder="Или выберите вручную" /></SelectTrigger>
            <SelectContent>
              {masters.map((m: any) => (
                <SelectItem key={m.id} value={m.user_id || m.id}>
                  {m.full_name} — ★{m.average_rating} {m.is_top_master ? "🏆" : ""} {m.quality_flag === "poor" ? "⚠️" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(null)} className="rounded-full">Отмена</Button>
            <Button onClick={assignMaster} disabled={!selectedMasterId} className="rounded-full">Назначить</Button>
          </DialogFooter>
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
