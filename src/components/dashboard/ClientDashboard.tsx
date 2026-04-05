import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "./DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList, Plus, Star, Clock, User, XCircle, MapPin, Phone,
  CheckCircle, ChevronRight, Bell, MessageSquare, Loader2, Calendar, FileText,
  CreditCard, DollarSign, Heart, HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders";
import { useNotifications } from "@/hooks/useNotifications";
import { useToast } from "@/hooks/use-toast";
import ReviewModal from "./ReviewModal";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OrderChat from "@/components/OrderChat";
import { PaymentDialog, PaymentStatusBadge, PriceBreakdown, ReceiptDialog } from "@/components/payment/PaymentComponents";
import FavoritesSection from "@/components/favorites/FavoritesSection";
import SupportTicketDialog from "@/components/SupportTicketDialog";

const allStatuses = [
  { key: "new", label: "Новый заказ", icon: ClipboardList, color: "bg-blue-500" },
  { key: "accepted", label: "Принят админом", icon: CheckCircle, color: "bg-yellow-500" },
  { key: "assigned", label: "Назначен мастер", icon: User, color: "bg-indigo-500" },
  { key: "on_the_way", label: "Мастер в пути", icon: MapPin, color: "bg-cyan-500" },
  { key: "arrived", label: "Мастер прибыл", icon: MapPin, color: "bg-teal-500" },
  { key: "in_progress", label: "Работа выполняется", icon: Clock, color: "bg-purple-500" },
  { key: "completed", label: "Завершён", icon: CheckCircle, color: "bg-green-500" },
  { key: "cancelled", label: "Отменён", icon: XCircle, color: "bg-red-500" },
];

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

type Tab = "orders" | "active" | "completed" | "payments" | "profile" | "reviews" | "notifications" | "application" | "favorites";

// Кабинет клиента объединяет заказы, оплаты, профиль, отзывы, избранное и поддержку.
export default function ClientDashboard() {
  const { user, profile, refetchUserData, hasRole } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("orders");
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [masterInfo, setMasterInfo] = useState<any>(null);
  const [myApplication, setMyApplication] = useState<any>(null);
  const { notifications, unreadCount } = useNotifications(user?.id);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [payOrder, setPayOrder] = useState<any>(null);
  const [receiptOrder, setReceiptOrder] = useState<any>(null);
  const [supportOpen, setSupportOpen] = useState(false);

  // Profile editing
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const fetchOrders = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*, service_categories(name_ru), services(name_ru)")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data || []);
    setLoading(false);
  };

  const fetchApplication = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("master_applications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (data && data.length > 0) setMyApplication(data[0]);
  };

  useEffect(() => { fetchOrders(); fetchApplication(); }, [user]);
  useEffect(() => {
    if (profile) {
      setEditName(profile.full_name || "");
      setEditPhone(profile.phone || "");
    }
  }, [profile]);

  // Poll for role change after application approval — switch to master dashboard immediately
  useEffect(() => {
    // Poll if user has a pending application OR no application yet (to catch quick approvals)
    if (myApplication && myApplication.status !== "pending") return;
    
    const interval = setInterval(async () => {
      if (!user) return;
      // Check both: application approved AND master role granted
      const [appRes, roleRes] = await Promise.all([
        supabase
          .from("master_applications")
          .select("status")
          .eq("user_id", user.id)
          .eq("status", "approved")
          .limit(1),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "master")
          .limit(1),
      ]);
      
      const isApproved = (appRes.data && appRes.data.length > 0) || (roleRes.data && roleRes.data.length > 0);
      
      if (isApproved) {
        await refetchUserData();
        toast({ title: "🎉 Поздравляем!", description: "Ваша заявка одобрена! Переход в кабинет мастера..." });
        // Small delay for toast visibility, then reload to switch layout
        setTimeout(() => {
          navigate("/master-dashboard", { replace: true });
          window.location.reload();
        }, 1500);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [myApplication, user, refetchUserData, navigate, toast]);

  useRealtimeOrders({ userId: user?.id, role: "client", onUpdate: fetchOrders });

  const cancelOrder = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else { toast({ title: "Заказ отменён" }); fetchOrders(); }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    await supabase.from("profiles").update({ full_name: editName, phone: editPhone }).eq("user_id", user.id);
    setSavingProfile(false);
    toast({ title: "Профиль обновлён" });
  };

  const openOrderDetail = async (order: any) => {
    setSelectedOrder(order);
    setMasterInfo(null);
    if (order.master_id) {
      const { data } = await supabase.from("master_listings").select("*").eq("user_id", order.master_id).maybeSingle();
      if (!data) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("user_id", order.master_id).maybeSingle();
        setMasterInfo(profileData);
      } else {
        setMasterInfo(data);
      }
    }
  };

  const activeOrders = orders.filter(o => !["completed", "cancelled", "reviewed"].includes(o.status));
  const completedOrders = orders.filter(o => ["completed", "reviewed"].includes(o.status));
  const clientReviews = orders.filter(o => o.status === "reviewed");

  const paidOrders = orders.filter(o => (o as any).payment_status === "paid");

  const navItems = [
    { path: "/dashboard", label: "Мои заказы", icon: ClipboardList, badge: activeOrders.length },
    { path: "/dashboard/favorites", label: t("favorites"), icon: Heart },
    { path: "/dashboard/payments", label: "Оплата", icon: CreditCard },
    { path: "/dashboard/profile", label: "Профиль", icon: User },
    { path: "/dashboard/notifications", label: "Уведомления", icon: Bell, badge: unreadCount },
  ];

  const stats = [
    { label: "Всего", value: orders.length, icon: ClipboardList, gradient: "from-blue-500/10 to-sky-500/10", iconColor: "text-blue-600", iconBg: "bg-blue-500/10" },
    { label: "Активных", value: activeOrders.length, icon: Clock, gradient: "from-amber-500/10 to-yellow-500/10", iconColor: "text-amber-600", iconBg: "bg-amber-500/10" },
    { label: "Завершённых", value: completedOrders.length, icon: CheckCircle, gradient: "from-emerald-500/10 to-green-500/10", iconColor: "text-emerald-600", iconBg: "bg-emerald-500/10" },
    { label: "Оплачено", value: paidOrders.length, icon: DollarSign, gradient: "from-emerald-500/10 to-teal-500/10", iconColor: "text-emerald-600", iconBg: "bg-emerald-500/10" },
  ];

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }>; count?: number }[] = [
    { key: "orders", label: "Все заказы", icon: ClipboardList, count: orders.length },
    { key: "active", label: "Активные", icon: Clock, count: activeOrders.length },
    { key: "completed", label: "Завершённые", icon: CheckCircle, count: completedOrders.length },
    { key: "payments", label: "Оплата", icon: CreditCard, count: paidOrders.length },
    ...(myApplication ? [{ key: "application" as Tab, label: "Заявка мастера", icon: FileText }] : []),
    { key: "profile", label: "Профиль", icon: User },
    { key: "notifications", label: "Уведомления", icon: Bell, count: unreadCount },
  ];

  const displayOrders = tab === "active" ? activeOrders : tab === "completed" ? completedOrders : orders;

  // Order timeline component
  const OrderTimeline = ({ order }: { order: any }) => {
    const statusFlow = allStatuses.filter(s => s.key !== "cancelled");
    const currentIdx = statusFlow.findIndex(s => s.key === order.status);
    const isCancelled = order.status === "cancelled";

    return (
      <div className="relative py-2">
        {isCancelled ? (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20">
            <XCircle className="w-6 h-6 text-red-500" />
            <span className="font-medium text-red-700 dark:text-red-400">Заказ отменён</span>
          </div>
        ) : (
          <div className="space-y-0">
            {statusFlow.map((s, i) => {
              const isCompleted = i <= currentIdx;
              const isCurrent = i === currentIdx;
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex items-start gap-3 relative">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                      isCompleted
                        ? isCurrent ? `${s.color} text-white shadow-md` : "bg-green-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {isCompleted && !isCurrent ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    {i < statusFlow.length - 1 && (
                      <div className={`w-0.5 h-6 ${i < currentIdx ? "bg-green-500" : "bg-muted"}`} />
                    )}
                  </div>
                  <div className={`pb-4 ${isCurrent ? "font-medium text-foreground" : isCompleted ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
                    <p className="text-sm leading-none pt-1.5">{s.label}</p>
                    {isCurrent && (
                      <p className="text-xs text-primary mt-1 animate-pulse">← Текущий статус</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout title={t("clientCabinet")} navItems={navItems}>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((s, i) => (
          <Card key={i} className={`bg-gradient-to-br ${s.gradient} border-0 shadow-sm`}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl ${s.iconBg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-5 h-5 ${s.iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4 border-b border-border pb-2 overflow-x-auto scrollbar-hide">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          return (
            <Button key={tb.key} variant={tab === tb.key ? "default" : "ghost"} size="sm" onClick={() => setTab(tb.key)} className="rounded-full whitespace-nowrap gap-1.5 shrink-0 text-xs">
              <Icon className="w-3.5 h-3.5" />
              {tb.label}
              {tb.count !== undefined && tb.count > 0 && (
                <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] ml-0.5">{tb.count}</Badge>
              )}
            </Button>
          );
        })}
      </div>

      {/* Content */}
      {tab === "profile" ? (
        <Card>
          <CardHeader><CardTitle className="text-lg">Мой профиль</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Имя</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-11" />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">Телефон</label>
              <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="h-11" />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile} className="rounded-full">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Сохранить
            </Button>
          </CardContent>
        </Card>
      ) : tab === "payments" ? (
        <div className="space-y-3">
          <h3 className="text-base font-semibold mb-2">История оплат</h3>
          {orders.filter(o => (o as any).payment_status && (o as any).payment_status !== "unpaid").length === 0 ? (
            <Card><CardContent className="py-12 text-center"><CreditCard className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Нет оплат</p></CardContent></Card>
          ) : orders.filter(o => (o as any).payment_status && (o as any).payment_status !== "unpaid").map(o => (
            <Card key={o.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{(o as any).services?.name_ru || "Заказ"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ru-RU")}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">{((o as any).total_amount || o.budget || 0).toLocaleString()} сомонӣ</span>
                  <PaymentStatusBadge status={(o as any).payment_status} />
                  {(o as any).payment_status === "paid" && (
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setReceiptOrder(o)}>
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Unpaid completed orders */}
          {completedOrders.filter(o => !(o as any).payment_status || (o as any).payment_status === "unpaid").length > 0 && (
            <>
              <h3 className="text-base font-semibold mt-6 mb-2">Ожидает оплаты</h3>
              {completedOrders.filter(o => !(o as any).payment_status || (o as any).payment_status === "unpaid").map(o => (
                <Card key={o.id} className="border-amber-200 bg-amber-50/50">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{(o as any).services?.name_ru || "Заказ"}</p>
                      <p className="text-xs text-muted-foreground">{((o as any).total_amount || o.budget || 0).toLocaleString()} сомонӣ</p>
                    </div>
                    <Button size="sm" className="rounded-full gap-1.5" onClick={() => setPayOrder(o)}>
                      <CreditCard className="w-3.5 h-3.5" /> Оплатить
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      ) : tab === "application" && myApplication ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              {myApplication.status === "pending" && (
                <>
                  <Clock className="w-14 h-14 text-amber-500 mx-auto mb-4" />
                  <Badge className="bg-amber-100 text-amber-800 mb-3">На рассмотрении</Badge>
                  <h3 className="text-xl font-bold text-foreground mb-2">Заявка на рассмотрении</h3>
                  <p className="text-muted-foreground">Администратор рассматривает вашу заявку. Мы уведомим вас о результате.</p>
                </>
              )}
              {myApplication.status === "approved" && (
                <>
                  <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
                  <Badge className="bg-green-100 text-green-800 mb-3">Одобрена</Badge>
                  <h3 className="text-xl font-bold text-foreground mb-2">Заявка одобрена!</h3>
                  <p className="text-muted-foreground mb-4">Вы можете работать как мастер. Перезайдите, чтобы увидеть панель мастера.</p>
                </>
              )}
              {myApplication.status === "rejected" && (
                <>
                  <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
                  <Badge className="bg-red-100 text-red-800 mb-3">Отклонена</Badge>
                  <h3 className="text-xl font-bold text-foreground mb-2">Заявка отклонена</h3>
                  <p className="text-muted-foreground mb-4">К сожалению, ваша заявка была отклонена. Вы можете подать новую.</p>
                  <Button onClick={() => navigate("/become-master")} className="rounded-full">Подать новую заявку</Button>
                </>
              )}
              <div className="mt-6 text-xs text-muted-foreground space-y-1">
                <p>Специализация: {myApplication.specialization}</p>
                <p>Район: {myApplication.district}</p>
                <p>Подана: {new Date(myApplication.created_at).toLocaleDateString("ru-RU")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : tab === "notifications" ? (
        <div className="space-y-2">
          {notifications.length === 0 ? (
            <Card><CardContent className="py-12 text-center"><Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Нет уведомлений</p></CardContent></Card>
          ) : notifications.map(n => (
            <Card key={n.id} className={!n.read ? "border-primary/30 bg-primary/5" : ""}>
              <CardContent className="p-4">
                <p className="font-medium text-sm text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(n.created_at).toLocaleString("ru-RU")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tab === "favorites" ? (
        <FavoritesSection />
      ) : (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">
              {tab === "active" ? "Активные заказы" : tab === "completed" ? "Завершённые заказы" : "Мои заказы"}
            </h2>
            <Button onClick={() => navigate("/categories")} size="sm" className="rounded-full gap-2">
              <Plus className="w-4 h-4" /> Новый заказ
            </Button>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
          ) : displayOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">Заказы не найдены</p>
                <Button onClick={() => navigate("/categories")} className="rounded-full">
                  <Plus className="w-4 h-4 mr-2" /> Создать заказ
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {displayOrders.map(order => {
                const isActive = !["completed", "cancelled", "reviewed"].includes(order.status);
                const liveStatuses: Record<string, string> = {
                  on_the_way: "🚗 Мастер в пути",
                  arrived: "📍 Мастер прибыл",
                  in_progress: "🔧 Работа выполняется",
                };

                return (
                  <Card key={order.id} className="hover:shadow-md transition-all cursor-pointer" onClick={() => openOrderDetail(order)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate">
                            {order.services?.name_ru || order.service_categories?.name_ru || "Заказ"}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3" /> <span className="truncate">{order.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            <Calendar className="w-3 h-3" /> {new Date(order.created_at).toLocaleDateString("ru-RU")}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <Badge className={statusColors[order.status] || "bg-muted"}>
                            {statusLabels[order.status] || order.status}
                          </Badge>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>

                      {/* Live status bar */}
                      {liveStatuses[order.status] && (
                        <div className="mt-2 p-2.5 rounded-xl bg-primary/5 border border-primary/20">
                          <p className="text-sm font-medium text-primary animate-pulse">{liveStatuses[order.status]}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                        {order.status === "new" && (
                          <Button size="sm" variant="destructive" onClick={() => cancelOrder(order.id)} className="rounded-full gap-1 text-xs">
                            <XCircle className="w-3 h-3" /> Отменить
                          </Button>
                        )}
                        {order.status === "completed" && order.master_id && (
                          <Button size="sm" onClick={() => setReviewOrder(order)} className="rounded-full gap-1 text-xs">
                            <Star className="w-3 h-3" /> Оставить отзыв
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Детали заказа</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <p className="font-semibold text-foreground text-lg">
                  {selectedOrder.services?.name_ru || selectedOrder.service_categories?.name_ru || "Заказ"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{selectedOrder.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Адрес:</span><p className="font-medium">{selectedOrder.address}</p></div>
                <div><span className="text-muted-foreground">Телефон:</span><p className="font-medium">{selectedOrder.phone}</p></div>
                <div><span className="text-muted-foreground">Дата:</span><p className="font-medium">{new Date(selectedOrder.created_at).toLocaleDateString("ru-RU")}</p></div>
                {selectedOrder.budget > 0 && <div><span className="text-muted-foreground">Бюджет:</span><p className="font-medium">{selectedOrder.budget} сомонӣ</p></div>}
              </div>

              {/* Master info */}
              {masterInfo && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-primary mb-2">Назначенный мастер</p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {masterInfo.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{masterInfo.full_name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {masterInfo.average_rating && (
                            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{masterInfo.average_rating}</span>
                          )}
                          {masterInfo.experience_years && <span>{masterInfo.experience_years} лет</span>}
                          {masterInfo.phone && (
                            <a href={`tel:${masterInfo.phone}`} className="text-primary hover:underline flex items-center gap-0.5">
                              <Phone className="w-3 h-3" /> Позвонить
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Timeline */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Статус заказа</p>
                <OrderTimeline order={selectedOrder} />
              </div>

              {/* Payment section */}
              {["completed", "reviewed"].includes(selectedOrder.status) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Оплата</span>
                    <PaymentStatusBadge status={(selectedOrder as any).payment_status || "unpaid"} />
                  </div>
                  {(selectedOrder as any).total_amount > 0 && (
                    <PriceBreakdown
                      servicePrice={(selectedOrder as any).service_price || (selectedOrder as any).total_amount || selectedOrder.budget}
                      materialsCost={(selectedOrder as any).materials_cost || 0}
                      urgencySurcharge={(selectedOrder as any).urgency_surcharge || 0}
                      totalAmount={(selectedOrder as any).total_amount || selectedOrder.budget || 0}
                      compact
                    />
                  )}
                  <div className="flex gap-2">
                    {(!(selectedOrder as any).payment_status || (selectedOrder as any).payment_status === "unpaid" || (selectedOrder as any).payment_status === "failed") && (
                      <Button className="flex-1 rounded-xl gap-1.5" onClick={() => setPayOrder(selectedOrder)}>
                        <CreditCard className="w-4 h-4" /> Оплатить сейчас
                      </Button>
                    )}
                    {(selectedOrder as any).payment_status === "paid" && (
                      <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={() => setReceiptOrder(selectedOrder)}>
                        <FileText className="w-4 h-4" /> Скачать чек
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Chat button */}
              {selectedOrder.master_id && !["cancelled"].includes(selectedOrder.status) && (
                <Button
                  variant="outline"
                  className="w-full rounded-xl gap-2"
                  onClick={() => setChatOrderId(selectedOrder.id)}
                >
                  <MessageSquare className="w-4 h-4" />
                  Чат с мастером
                </Button>
              )}
            </div>
          )}

          {/* Inline chat */}
          {chatOrderId === selectedOrder?.id && (
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

      {reviewOrder && (
        <ReviewModal
          isOpen={!!reviewOrder}
          onClose={() => setReviewOrder(null)}
          orderId={reviewOrder.id}
          masterId={reviewOrder.master_id}
          clientId={user!.id}
          onSubmitted={fetchOrders}
        />
      )}

      {/* Payment dialog */}
      <PaymentDialog
        order={payOrder}
        open={!!payOrder}
        onOpenChange={(open) => { if (!open) setPayOrder(null); }}
        onPaymentComplete={() => { setPayOrder(null); fetchOrders(); }}
      />

      {/* Receipt dialog */}
      <ReceiptDialog
        order={receiptOrder}
        clientName={profile?.full_name}
        masterName={masterInfo?.full_name}
        open={!!receiptOrder}
        onOpenChange={(open) => { if (!open) setReceiptOrder(null); }}
      />

      {/* Support button (floating) */}
      <div className="fixed bottom-24 right-4 z-40">
        <Button onClick={() => setSupportOpen(true)} size="lg" className="rounded-full shadow-xl gap-2 bg-gradient-to-r from-primary to-emerald-500">
          <HelpCircle className="w-5 h-5" /> {t("supportBtn")}
        </Button>
      </div>
      <SupportTicketDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </DashboardLayout>
  );
}
