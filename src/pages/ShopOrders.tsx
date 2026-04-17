import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { getFallbackProductById, isFallbackProductId } from "@/data/shopFallback";
import {
  getLocalShopOrderById,
  getLocalShopOrderItemsMap,
  getLocalShopOrdersByUser,
  mergeShopOrders,
  updateLocalShopOrderStatus,
} from "@/lib/localShopOrders";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Phone,
  ShoppingBag,
  TicketPercent,
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

type ShopOrderProduct = {
  id: string;
  name: string;
  image_url: string | null;
  images: string[] | null;
  price: number;
  category_id: string;
};

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Ожидает подтверждения", className: "border-amber-200 bg-amber-100 text-amber-800" },
  confirmed: { label: "Подтвержден", className: "border-sky-200 bg-sky-100 text-sky-800" },
  processing: { label: "Собирается", className: "border-violet-200 bg-violet-100 text-violet-800" },
  shipped: { label: "В пути", className: "border-blue-200 bg-blue-100 text-blue-800" },
  delivered: { label: "Доставлен", className: "border-emerald-200 bg-emerald-100 text-emerald-800" },
  completed: { label: "Завершен", className: "border-emerald-200 bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Отменен", className: "border-rose-200 bg-rose-100 text-rose-800" },
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

export default function ShopOrders() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const createdOrderId = searchParams.get("created");
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [orderItems, setOrderItems] = useState<ShopOrderItem[]>([]);
  const [products, setProducts] = useState<Record<string, ShopOrderProduct>>({});

  const loadOrders = async () => {
    if (!user) return;

    setLoading(true);

    const { data: ordersData, error: ordersError } = await supabase
      .from("shop_orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (ordersError) {
      setLoading(false);
      return;
    }

    const loadedOrders = mergeShopOrders(
      (ordersData || []) as ShopOrder[],
      getLocalShopOrdersByUser(user.id) as ShopOrder[],
    );
    setOrders(loadedOrders);

    if (loadedOrders.length === 0) {
      setOrderItems([]);
      setProducts({});
      setLoading(false);
      return;
    }

    const orderIds = loadedOrders.map((order) => order.id);
    const { data: itemsData } = await supabase
      .from("shop_order_items")
      .select("*")
      .in("order_id", orderIds);

    const loadedItems = (itemsData || []) as ShopOrderItem[];
    
    const storedItems = getLocalShopOrderItemsMap();
    const fallbackItems = orderIds.flatMap((id) => storedItems[id] || []);

    const allItems = [...loadedItems, ...fallbackItems];
    setOrderItems(allItems);

    const productIds = [...new Set(allItems.map((item) => item.product_id))];
    const realProductIds = productIds.filter(pid => !isFallbackProductId(pid));
    
    let productsMap: Record<string, ShopOrderProduct> = {};

    if (realProductIds.length > 0) {
      const { data: productsData } = await supabase
        .from("shop_products")
        .select("id, name, image_url, images, price, category_id")
        .in("id", realProductIds);

      productsMap = Object.fromEntries(((productsData || []) as ShopOrderProduct[]).map((product) => [product.id, product]));
    }

    productIds.filter(pid => isFallbackProductId(pid)).forEach(pid => {
      const fbProduct = getFallbackProductById(pid);
      if (fbProduct) productsMap[pid] = fbProduct as any;
    });

    setProducts(productsMap);

    setLoading(false);
  };

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadOrders();
  }, [navigate, user]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "mc_local_shop_orders" || event.key === "mc_fallback_orders") {
        void loadOrders();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [user]);

  const itemsByOrder = useMemo(
    () =>
      orderItems.reduce<Record<string, ShopOrderItem[]>>((acc, item) => {
        if (!acc[item.order_id]) acc[item.order_id] = [];
        acc[item.order_id].push(item);
        return acc;
      }, {}),
    [orderItems],
  );

  const cancelOrder = async (orderId: string) => {
    setCancelId(orderId);
    const localOrder = getLocalShopOrderById(orderId);
    let error = null;

    if (localOrder) {
      updateLocalShopOrderStatus(orderId, "cancelled");
    } else {
      const result = await supabase
        .from("shop_orders")
        .update({ status: "cancelled" })
        .eq("id", orderId)
        .eq("user_id", user?.id)
        .eq("status", "pending");
      error = result.error;
    }

    setCancelId(null);

    if (error) {
      toast({ title: "Не удалось отменить заказ", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Заказ отменен", description: "Статус обновлен и администраторы уведомлены." });
    await loadOrders();
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              В магазин
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">Магазин / Мои заказы</p>
              <h1 className="text-3xl font-bold text-foreground">Мои заказы</h1>
              <p className="mt-2 text-muted-foreground">
                Здесь видны ваши покупки, статусы, скидки, оплата и быстрый переход к деталям заказа.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/cart">Корзина</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/shop">Продолжить покупки</Link>
            </Button>
          </div>
        </div>

        {createdOrderId && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50/70">
            <CardContent className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-emerald-500/10 p-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Заказ успешно оформлен</h2>
                  <p className="text-sm text-muted-foreground">
                    Номер заказа: <span className="font-medium text-foreground">#{createdOrderId.slice(0, 8).toUpperCase()}</span>
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  searchParams.delete("created");
                  setSearchParams(searchParams);
                }}
              >
                Понятно
              </Button>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-16 text-center">
              <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-primary/40" />
              <h2 className="mb-2 text-2xl font-bold text-foreground">У вас пока нет заказов</h2>
              <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
                Добавьте товары в корзину, оформите покупку и здесь появится история ваших заказов.
              </p>
              <Button asChild className="rounded-full">
                <Link to="/shop">Перейти в магазин</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const config = statusConfig[order.status] || {
                label: order.status,
                className: "border-border bg-muted text-foreground",
              };
              const items = itemsByOrder[order.id] || [];
              const isNewlyCreated = createdOrderId === order.id;

              return (
                <Card
                  key={order.id}
                  className={`overflow-hidden border-border/70 ${isNewlyCreated ? "ring-2 ring-emerald-400/60" : ""}`}
                >
                  <CardContent className="p-0">
                    <div className="border-b border-border/60 bg-muted/20 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-bold text-foreground">
                              Заказ #{order.id.slice(0, 8).toUpperCase()}
                            </h2>
                            <Badge className={config.className}>{config.label}</Badge>
                            {isNewlyCreated && <Badge className="bg-emerald-600 text-white">Новый заказ</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleString("ru-RU", {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <div className="text-left md:text-right">
                          <p className="text-sm text-muted-foreground">Итого</p>
                          <p className="text-2xl font-bold text-primary">{order.total} сомонӣ</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 border-b border-border/60 p-5 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-2xl bg-muted/30 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Получатель</p>
                        <p className="font-medium text-foreground">{order.customer_name || "Клиент"}</p>
                        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          {order.phone || "Не указан"}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/30 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Доставка</p>
                        <p className="flex items-start gap-2 text-sm text-foreground">
                          <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{order.delivery_address || "Адрес не указан"}</span>
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/30 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Оплата</p>
                        <p className="flex items-start gap-2 text-sm text-foreground">
                          <CreditCard className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{paymentMethodLabels[order.payment_method || "cash"] || "Не указана"}</span>
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {paymentStatusLabels[order.payment_status || "unpaid"] || order.payment_status}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-muted/30 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Скидка</p>
                        {order.discount_amount > 0 ? (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-emerald-700">{order.discount_amount} сомонӣ</p>
                            {order.promo_code && (
                              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                                <TicketPercent className="h-4 w-4 text-primary" />
                                {order.promo_code}
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Без скидки</p>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-foreground">Товары в заказе</h3>
                          <Badge variant="secondary">{items.length}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {order.status === "pending" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-full text-destructive"
                              onClick={() => cancelOrder(order.id)}
                              disabled={cancelId === order.id}
                            >
                              {cancelId === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                              Отменить
                            </Button>
                          )}
                          <Button asChild variant="outline" size="sm" className="rounded-full">
                            <Link to={`/shop/orders/${order.id}`}>Открыть заказ</Link>
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {items.slice(0, 2).map((item) => {
                          const product = products[item.product_id];
                          const installationTotal = item.include_installation
                            ? (item.installation_price || 0) * item.quantity
                            : 0;
                          const itemTotal = item.price * item.quantity + installationTotal;

                          return (
                            <div
                              key={item.id}
                              className="flex flex-col gap-4 rounded-2xl border border-border/60 p-4 md:flex-row md:items-center md:justify-between"
                            >
                              <div className="flex min-w-0 items-center gap-4">
                                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-muted/30">
                                  {product ? (
                                    <SmartProductImage
                                      product={product}
                                      alt={product.name}
                                      className="h-full w-full object-contain"
                                    />
                                  ) : (
                                    <Package className="h-8 w-8 text-muted-foreground/40" />
                                  )}
                                </div>
                                <div className="min-w-0 space-y-1">
                                  <p className="font-medium text-foreground">
                                    {product?.name || "Товар больше недоступен"}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    {item.price} сомонӣ x {item.quantity}
                                  </p>
                                  {item.include_installation && (
                                    <p className="inline-flex items-center gap-1 text-sm text-emerald-700">
                                      <Wrench className="h-4 w-4" />
                                      Установка включена
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Сумма позиции</p>
                                <p className="text-lg font-bold text-foreground">{itemTotal} сомонӣ</p>
                              </div>
                            </div>
                          );
                        })}

                        {items.length > 2 && (
                          <p className="text-sm text-muted-foreground">
                            И еще {items.length - 2} товар(а) внутри заказа.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
