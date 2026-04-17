import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { getLocalShopOrderById } from "@/lib/localShopOrders";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  Package,
  Phone,
  Receipt,
  TicketPercent,
} from "lucide-react";

const paymentMethodLabels: Record<string, string> = {
  cash: "Наличными при получении",
  transfer: "Перевод на карту",
  card: "Картой при получении",
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "Оплата при получении",
  pending: "Ожидает оплаты",
  paid: "Оплачено",
  failed: "Ошибка оплаты",
};

export default function ShopThankYou() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!id) {
      navigate("/shop/orders");
      return;
    }

    const loadOrder = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("shop_orders")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      const localOrder = getLocalShopOrderById(id);
      const resolvedOrder = data || (localOrder?.user_id === user.id ? localOrder : null);
      setOrder(resolvedOrder || null);
      setLoading(false);
    };

    loadOrder();
  }, [id, navigate, user]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-3xl px-4 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !order ? (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-16 text-center">
              <Package className="mx-auto mb-4 h-16 w-16 text-primary/40" />
              <h1 className="mb-2 text-2xl font-bold text-foreground">Заказ не найден</h1>
              <p className="mb-6 text-muted-foreground">
                Возможно, ссылка устарела или заказ уже недоступен в этом аккаунте.
              </p>
              <Button asChild className="rounded-full">
                <Link to="/shop/orders">Перейти к заказам</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-emerald-200 bg-emerald-50/70">
              <CardContent className="py-10 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">Спасибо за заказ</p>
                <h1 className="mb-3 text-3xl font-bold text-foreground">
                  Заказ #{order.id.slice(0, 8).toUpperCase()} оформлен
                </h1>
                <p className="mx-auto max-w-xl text-muted-foreground">
                  Мы получили вашу заявку. Дальше менеджер подтвердит заказ, а вы сможете следить за ним в разделе "Мои заказы".
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Сумма заказа</p>
                  <p className="text-2xl font-bold text-primary">{order.total} сомонӣ</p>
                  {order.discount_amount > 0 && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-emerald-700">
                      <TicketPercent className="h-4 w-4" />
                      Скидка {order.discount_amount} сомонӣ по коду {order.promo_code}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Оплата</p>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">
                      {paymentMethodLabels[order.payment_method || "cash"] || "Способ оплаты не указан"}
                    </span>
                  </div>
                  <Badge className="mt-3 bg-primary/10 text-primary hover:bg-primary/10">
                    {paymentStatusLabels[order.payment_status || "unpaid"] || order.payment_status}
                  </Badge>
                </div>

                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Доставка</p>
                  <p className="flex items-start gap-2 text-sm text-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{order.delivery_address || "Адрес не указан"}</span>
                  </p>
                </div>

                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Контакт</p>
                  <p className="flex items-center gap-2 text-sm text-foreground">
                    <Phone className="h-4 w-4 text-primary" />
                    <span>{order.phone || "Телефон не указан"}</span>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <h2 className="font-semibold text-foreground">Что дальше</h2>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>1. Мы проверим наличие товаров и подтвердим заказ.</p>
                  <p>2. Если выбрана предоплата переводом, с вами свяжутся для подтверждения оплаты.</p>
                  <p>3. Статус заказа и состав доступны в разделе "Мои заказы".</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild className="rounded-full">
                    <Link to="/shop/orders">
                      Перейти к моим заказам
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/shop">Вернуться в магазин</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
