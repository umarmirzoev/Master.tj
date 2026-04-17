import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getFallbackProductById, isFallbackProductId } from "@/data/shopFallback";
import {
  getLocalShopOrderById,
  getLocalShopOrderItems,
  updateLocalShopOrderStatus,
} from "@/lib/localShopOrders";
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Phone,
  TicketPercent,
  Truck,
  Wrench,
  XCircle,
} from "lucide-react";

type ShopOrder = {
  id: string;
  created_at: string;
  updated_at: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  status: string;
  delivery_address: string | null;
  phone: string | null;
  customer_name: string | null;
  comments: string | null;
  payment_method: string | null;
  payment_status: string;
  promo_code: string | null;
};

type ShopOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  include_installation: boolean | null;
  installation_price: number | null;
};

type ShopOrderHistory = {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
};

const timelineSteps = ["pending", "confirmed", "processing", "shipped", "delivered"];

const statusLabels: Record<string, string> = {
  pending: "Создан",
  confirmed: "Подтвержден",
  processing: "Собирается",
  shipped: "В пути",
  delivered: "Доставлен",
  completed: "Завершен",
  cancelled: "Отменен",
};

const paymentMethodLabels: Record<string, string> = {
  cash: "Наличными при получении",
  card: "Картой при получении",
  transfer: "Перевод на карту",
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "Оплата при получении",
  pending: "Ожидает оплаты",
  paid: "Оплачено",
  failed: "Ошибка оплаты",
};

export default function ShopOrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [items, setItems] = useState<ShopOrderItem[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});
  const [history, setHistory] = useState<ShopOrderHistory[]>([]);

  const loadOrder = async () => {
    if (!user || !id) return;

    setLoading(true);
    const { data: orderData } = await supabase
      .from("shop_orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    const localOrder = getLocalShopOrderById(id);
    const resolvedOrder = (orderData || localOrder) as ShopOrder | null;

    if (!resolvedOrder || (resolvedOrder as any).user_id !== user.id) {
      setOrder(null);
      setLoading(false);
      return;
    }

    setOrder(resolvedOrder);

    const [{ data: itemsData }, { data: historyData }] = await Promise.all([
      supabase.from("shop_order_items").select("*").eq("order_id", id),
      supabase.from("shop_order_status_history").select("*").eq("order_id", id).order("created_at", { ascending: true }),
    ]);

    const loadedItems = [
      ...((itemsData || []) as ShopOrderItem[]),
      ...getLocalShopOrderItems(id),
    ];
    
    setItems(loadedItems);
    setHistory(
      ((historyData || []) as ShopOrderHistory[]).length > 0
        ? ((historyData || []) as ShopOrderHistory[])
        : [{
            id: `${id}-local-history`,
            status: resolvedOrder.status,
            note: (resolvedOrder as any).local_only ? "Локально сохранённый заказ" : null,
            created_at: resolvedOrder.updated_at || resolvedOrder.created_at,
          }],
    );

    const productIds = [...new Set(loadedItems.map((item) => item.product_id))];
    const realProductIds = productIds.filter(pid => !isFallbackProductId(pid));
    
    let productsMap: Record<string, any> = {};

    if (realProductIds.length > 0) {
      const { data: productsData } = await supabase
        .from("shop_products")
        .select("id, name, image_url, images, price, category_id")
        .in("id", realProductIds);

      productsMap = Object.fromEntries(((productsData || []) as any[]).map((product) => [product.id, product]));
    }
    
    // Add fallback products to map
    productIds.filter(pid => isFallbackProductId(pid)).forEach(pid => {
      const fbProduct = getFallbackProductById(pid);
      if (fbProduct) productsMap[pid] = fbProduct;
    });

    setProducts(productsMap);

    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!id) {
      navigate("/shop/orders");
      return;
    }

    loadOrder();
  }, [id, navigate, user]);

  const currentStepIndex = useMemo(() => {
    if (!order) return 0;
    if (order.status === "completed") return timelineSteps.length - 1;
    return Math.max(timelineSteps.indexOf(order.status), 0);
  }, [order]);

  const cancelOrder = async () => {
    if (!order || order.status !== "pending") return;

    setCancelling(true);
    let error = null;

    if ((order as any).local_only) {
      updateLocalShopOrderStatus(order.id, "cancelled");
    } else {
      const result = await supabase
        .from("shop_orders")
        .update({ status: "cancelled" })
        .eq("id", order.id)
        .eq("user_id", user?.id)
        .eq("status", "pending");
      error = result.error;
    }

    setCancelling(false);

    if (error) {
      toast({ title: "Не удалось отменить заказ", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Заказ отменен", description: "Мы уведомили администраторов об отмене." });
    await loadOrder();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Link to="/shop/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              Ко всем заказам
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">Магазин / Мои заказы / Детали</p>
              <h1 className="text-3xl font-bold text-foreground">
                {order ? `Заказ #${order.id.slice(0, 8).toUpperCase()}` : "Заказ"}
              </h1>
            </div>
          </div>
          {order?.status === "pending" && (
            <Button variant="outline" className="rounded-full text-destructive" onClick={cancelOrder} disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Отменить заказ
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !order ? (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-16 text-center">
              <Package className="mx-auto mb-4 h-16 w-16 text-primary/40" />
              <h2 className="mb-2 text-2xl font-bold text-foreground">Заказ не найден</h2>
              <p className="mb-6 text-muted-foreground">Возможно, он был удален или недоступен для этого аккаунта.</p>
              <Button asChild className="rounded-full">
                <Link to="/shop/orders">Назад к заказам</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <div className="mb-6 flex flex-wrap items-center gap-3">
                  <Badge className="bg-primary/10 text-primary hover:bg-primary/10">{statusLabels[order.status] || order.status}</Badge>
                  <Badge variant="outline">{paymentStatusLabels[order.payment_status] || order.payment_status}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleString("ru-RU", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="grid gap-4 md:grid-cols-5">
                  {timelineSteps.map((step, index) => {
                    const active = order.status !== "cancelled" && index <= currentStepIndex;
                    const current = order.status === step || (order.status === "completed" && step === "delivered");

                    return (
                      <div key={step} className="relative rounded-2xl border border-border/70 p-4">
                        <div className={`mb-3 h-9 w-9 rounded-full ${active ? "bg-primary text-white" : "bg-muted text-muted-foreground"} flex items-center justify-center font-semibold`}>
                          {index + 1}
                        </div>
                        <p className={`font-medium ${current ? "text-foreground" : "text-muted-foreground"}`}>{statusLabels[step]}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {history.find((entry) => entry.status === step)?.created_at
                            ? new Date(history.find((entry) => entry.status === step)!.created_at).toLocaleDateString("ru-RU")
                            : "Ожидает"}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {order.status === "cancelled" && (
                  <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    Заказ был отменен. Если это произошло по ошибке, оформите новый заказ из магазина.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-foreground">Состав заказа</h2>
                  </div>

                  <div className="space-y-3">
                    {items.map((item) => {
                      const product = products[item.product_id];
                      const installationTotal = item.include_installation ? (item.installation_price || 0) * item.quantity : 0;
                      const rowTotal = item.price * item.quantity + installationTotal;

                      return (
                        <div key={item.id} className="flex flex-col gap-4 rounded-2xl border border-border/60 p-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-muted/30">
                              {product ? (
                                <SmartProductImage product={product} alt={product.name} className="h-full w-full object-contain" />
                              ) : (
                                <Package className="h-8 w-8 text-muted-foreground/40" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{product?.name || "Товар недоступен"}</p>
                              <p className="text-sm text-muted-foreground">{item.price} сомонӣ x {item.quantity}</p>
                              {item.include_installation && (
                                <p className="mt-1 inline-flex items-center gap-1 text-sm text-emerald-700">
                                  <Wrench className="h-4 w-4" />
                                  Установка включена
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-muted-foreground">Сумма позиции</p>
                            <p className="text-lg font-bold text-foreground">{rowTotal} сомонӣ</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card>
                  <CardContent className="space-y-4 p-6">
                    <h2 className="font-semibold text-foreground">Получение и оплата</h2>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-2 text-foreground">
                        <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                        <span>{order.delivery_address || "Адрес не указан"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Phone className="h-4 w-4 text-primary" />
                        <span>{order.phone || "Телефон не указан"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span>{paymentMethodLabels[order.payment_method || "cash"] || "Способ оплаты не указан"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-4 p-6">
                    <div className="flex items-center gap-2">
                      <TicketPercent className="h-4 w-4 text-primary" />
                      <h2 className="font-semibold text-foreground">Итог</h2>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Подытог</span>
                        <span>{order.subtotal} сомонӣ</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Скидка</span>
                        <span className={order.discount_amount > 0 ? "text-emerald-700" : ""}>-{order.discount_amount} сомонӣ</span>
                      </div>
                      {order.promo_code && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>Промокод</span>
                          <span>{order.promo_code}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-border pt-3 text-base font-bold text-foreground">
                        <span>К оплате</span>
                        <span className="text-primary">{order.total} сомонӣ</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="space-y-3 p-6">
                    <h2 className="font-semibold text-foreground">История статусов</h2>
                    <div className="space-y-3">
                      {history.map((entry) => (
                        <div key={entry.id} className="rounded-2xl border border-border/60 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-foreground">{statusLabels[entry.status] || entry.status}</p>
                            <span className="text-xs text-muted-foreground">
                              {new Date(entry.created_at).toLocaleString("ru-RU")}
                            </span>
                          </div>
                          {entry.note && <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
