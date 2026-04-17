import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/hooks/useCart";
import RecommendedProducts from "@/components/shop/RecommendedProducts";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { isFallbackProductId } from "@/data/shopFallback";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { saveLocalShopOrder, saveLocalShopOrderItems } from "@/lib/localShopOrders";
import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  CreditCard,
  Loader2,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Tag,
  TicketPercent,
  Trash2,
  Wrench,
} from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
};

const paymentOptions = [
  {
    value: "cash",
    title: "Наличными при получении",
    description: "Оплата курьеру после подтверждения заказа",
    icon: Banknote,
  },
  {
    value: "card",
    title: "Картой при получении",
    description: "Оплата картой при передаче товара",
    icon: CreditCard,
  },
  {
    value: "transfer",
    title: "Перевод на карту",
    description: "После заказа мы пришлем реквизиты для оплаты",
    icon: ShieldCheck,
  },
];

export default function CartPage() {
  const { items, loading, totalPrice, updateQuantity, removeFromCart, toggleInstallation, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkout, setCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [form, setForm] = useState({ name: "", phone: "", address: "", comments: "" });

  useEffect(() => {
    if (!profile) return;

    setForm((current) => ({
      ...current,
      name: current.name || profile.full_name || "",
      phone: current.phone || profile.phone || "",
    }));
  }, [profile]);

  const discountAmount = useMemo(() => {
    if (!appliedPromo) return 0;

    if (appliedPromo.discount_type === "fixed") {
      return Math.min(Number(appliedPromo.discount_value || 0), totalPrice);
    }

    return Math.min(Math.round(totalPrice * (Number(appliedPromo.discount_value || 0) / 100)), totalPrice);
  }, [appliedPromo, totalPrice]);

  const finalTotal = Math.max(totalPrice - discountAmount, 0);

  const applyPromoCode = async () => {
    if (!promoInput.trim()) {
      setPromoError("Введите промокод");
      return;
    }

    setPromoLoading(true);
    setPromoError("");

    const normalizedCode = promoInput.trim().toUpperCase();
    const { data: promo, error } = await supabase
      .from("promo_codes")
      .select("*")
      .eq("code", normalizedCode)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !promo) {
      setPromoLoading(false);
      setAppliedPromo(null);
      setPromoError("Промокод не найден или уже выключен");
      return;
    }

    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      setPromoLoading(false);
      setAppliedPromo(null);
      setPromoError("Срок действия промокода истек");
      return;
    }

    if (promo.usage_limit && promo.times_used >= promo.usage_limit) {
      setPromoLoading(false);
      setAppliedPromo(null);
      setPromoError("Лимит использования этого промокода уже исчерпан");
      return;
    }

    if (user) {
      const { data: usage } = await supabase
        .from("promo_code_usage")
        .select("id")
        .eq("promo_code_id", promo.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (usage) {
        setPromoLoading(false);
        setAppliedPromo(null);
        setPromoError("Вы уже использовали этот промокод");
        return;
      }
    }

    setAppliedPromo(promo as PromoCode);
    setPromoLoading(false);
    toast({ title: "Промокод применен", description: `Скидка ${normalizedCode} активирована` });
  };

  const clearPromoCode = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  };

  const handleOrder = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!form.name || !form.phone || !form.address) {
      toast({ title: t("cartFillRequired"), variant: "destructive" });
      return;
    }

    setSubmitting(true);

    const paymentStatus = paymentMethod === "transfer" ? "pending" : "unpaid";
    const timestamp = new Date().toISOString();
    const baseOrderItems = items.map((item) => ({
      id: crypto.randomUUID(),
      order_id: "",
      product_id: item.product_id,
      quantity: item.quantity,
      price: (item as any).product?.price || 0,
      include_installation: item.include_installation,
      installation_price: item.include_installation ? ((item as any).product?.installation_price || 0) : 0,
    }));
    const orderPayload = {
      user_id: user.id,
      subtotal: totalPrice,
      discount_amount: discountAmount,
      total: finalTotal,
      delivery_address: form.address,
      phone: form.phone,
      customer_name: form.name,
      comments: form.comments,
      status: "pending",
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      promo_code: appliedPromo?.code || null,
      promo_code_id: appliedPromo?.id || null,
    };
    let createdOrderId: string | null = null;

    try {
      const { data: order, error } = await supabase
        .from("shop_orders")
        .insert(orderPayload)
        .select()
        .single();

      if (error || !order) {
        throw new Error(error?.message || "Не удалось создать заказ");
      }

      createdOrderId = order.id;

      const orderItems = baseOrderItems.map((item) => ({
        ...item,
        order_id: order.id,
      }));

      const realOrderItems = orderItems.filter((item) => !isFallbackProductId(item.product_id));
      const fallbackOrderItems = orderItems.filter((item) => isFallbackProductId(item.product_id));

      if (realOrderItems.length > 0) {
        const { error: orderItemsError } = await supabase.from("shop_order_items").insert(realOrderItems);
        if (orderItemsError) {
          throw new Error(orderItemsError.message);
        }
      }

      if (fallbackOrderItems.length > 0) {
        try {
          const storedFallbackOrders = JSON.parse(localStorage.getItem("mc_fallback_orders") || "{}");
          storedFallbackOrders[order.id] = fallbackOrderItems;
          localStorage.setItem("mc_fallback_orders", JSON.stringify(storedFallbackOrders));

          const { error: fallbackError } = await supabase.from("shop_order_items").insert(fallbackOrderItems);
          if (fallbackError) {
            console.error("Fallback order items insert error:", fallbackError.message);
          }
        } catch (storageError) {
          console.error("Local order save error", storageError);
        }
      }

      if (appliedPromo) {
        const { error: promoUsageError } = await supabase.from("promo_code_usage").insert({
          promo_code_id: appliedPromo.id,
          user_id: user.id,
          order_id: order.id,
          discount_applied: discountAmount,
        });

        if (promoUsageError) {
          throw new Error(promoUsageError.message);
        }

        const { error: promoUpdateError } = await supabase
          .from("promo_codes")
          .update({ times_used: (appliedPromo.times_used || 0) + 1 })
          .eq("id", appliedPromo.id);

        if (promoUpdateError) {
          throw new Error(promoUpdateError.message);
        }
      }

      const { error: notificationError } = await supabase.from("notifications").insert({
        user_id: user.id,
        title: t("cartOrderSuccess"),
        message: `${t("cartOrderSuccessDesc")}`,
        type: "shop_order",
        related_id: order.id,
      });

      if (notificationError) {
        console.error("Shop order notification error:", notificationError.message);
      }

      saveLocalShopOrder({
        id: order.id,
        ...orderPayload,
        created_at: order.created_at || timestamp,
        updated_at: order.updated_at || timestamp,
        local_only: true,
      });
      if (fallbackOrderItems.length > 0) {
        saveLocalShopOrderItems(order.id, fallbackOrderItems);
      }

      await clearCart();
      setCheckout(false);
      toast({ title: `${t("cartOrderSuccess")} ✓`, description: t("cartOrderSuccessDesc") });
      navigate(`/shop/thank-you/${order.id}`);
    } catch (err: any) {
      if (createdOrderId) {
        await supabase
          .from("shop_orders")
          .update({ status: "cancelled" })
          .eq("id", createdOrderId)
          .eq("user_id", user.id)
          .eq("status", "pending");
      }

      const localOrderId = `local-shop-${crypto.randomUUID()}`;
      saveLocalShopOrder({
        id: localOrderId,
        ...orderPayload,
        created_at: timestamp,
        updated_at: timestamp,
        local_only: true,
      });
      saveLocalShopOrderItems(
        localOrderId,
        baseOrderItems.map((item) => ({
          ...item,
          order_id: localOrderId,
        })),
      );

      await clearCart();
      setCheckout(false);
      toast({
        title: t("cartOrderSuccess"),
        description: "Заказ сохранён локально и уже появился в кабинетах.",
      });
      navigate(`/shop/thank-you/${localOrderId}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/shop">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">{t("cartTitle")}</h1>
          {items.length > 0 && <Badge variant="secondary">{items.length}</Badge>}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center">
            <ShoppingCart className="mx-auto mb-4 h-20 w-20 text-muted-foreground/20" />
            <h2 className="mb-2 text-xl font-bold text-foreground">{t("cartEmpty")}</h2>
            <p className="mb-6 text-muted-foreground">{t("cartEmptyHint")}</p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/shop">
                <Button className="rounded-full">{t("cartGoToShop")}</Button>
              </Link>
              {user && (
                <Button variant="outline" className="rounded-full" onClick={() => navigate("/shop/orders")}>
                  Мои заказы
                </Button>
              )}
            </div>
          </div>
        ) : !checkout ? (
          <div className="space-y-4">
            {items.map((item) => {
              const product = (item as any).product;
              if (!product) return null;

              return (
                <Card key={item.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-xl bg-muted/30">
                        <SmartProductImage
                          product={product}
                          alt={product.name}
                          className="h-full w-full rounded-xl object-contain"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <Link to={`/shop/product/${product.id}`}>
                          <h3 className="line-clamp-2 text-sm font-medium text-foreground hover:text-primary">
                            {product.name}
                          </h3>
                        </Link>
                        <p className="mt-1 text-lg font-bold text-foreground">
                          {product.price} {t("som")}{" "}
                          <span className="text-xs font-normal text-muted-foreground">x {item.quantity}</span>
                        </p>
                        {product.installation_price && (
                          <label className="mt-2 flex cursor-pointer items-center gap-2">
                            <Checkbox
                              checked={item.include_installation}
                              onCheckedChange={() => toggleInstallation(item.product_id)}
                            />
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Wrench className="h-3 w-3" />
                              {t("cartInstallation")} +{product.installation_price} {t("som")}
                            </span>
                          </label>
                        )}
                      </div>

                      <div className="flex flex-col items-end justify-between">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => removeFromCart(item.product_id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center rounded-full border border-border">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none"
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none"
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card className="border-primary/30">
              <CardContent className="p-5">
                <div className="flex justify-between text-lg font-bold">
                  <span>{t("shopTotal")}</span>
                  <span className="text-primary">{totalPrice} {t("somoni")}</span>
                </div>
                <div className="mt-4 grid gap-3">
                  <Button
                    className="h-12 rounded-full text-base"
                    onClick={() => (user ? setCheckout(true) : navigate("/auth"))}
                  >
                    {t("cartCheckout")}
                  </Button>
                  {user && (
                    <Button variant="outline" className="rounded-full" onClick={() => navigate("/shop/orders")}>
                      <PackageCheck className="h-4 w-4" />
                      Мои заказы
                    </Button>
                  )}
                </div>
                <Link to="/shop" className="mt-3 block text-center text-sm text-muted-foreground hover:text-primary">
                  ← {t("cartContinueShopping")}
                </Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="border-border">
              <CardContent className="space-y-5 p-6">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-foreground">{t("cartCheckout")}</h2>
                  <p className="text-sm text-muted-foreground">
                    Заполните данные для доставки, выберите оплату и при необходимости примените промокод.
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t("cartName")} *</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t("cartPhone")} *</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    type="tel"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t("cartDeliveryAddress")} *</label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">{t("cartComments")}</label>
                  <Textarea
                    value={form.comments}
                    onChange={(e) => setForm({ ...form, comments: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Способ оплаты</h3>
                  </div>
                  <div className="grid gap-3">
                    {paymentOptions.map((option) => {
                      const Icon = option.icon;
                      const active = paymentMethod === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPaymentMethod(option.value)}
                          className={`rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                              : "border-border hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`rounded-xl p-2 ${active ? "bg-primary/10" : "bg-muted/50"}`}>
                              <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{option.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-foreground">Промокод</h3>
                  </div>

                  {!appliedPromo ? (
                    <>
                      <div className="flex gap-2">
                        <Input
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          placeholder="Например: SALE10"
                          className="font-mono uppercase"
                        />
                        <Button type="button" variant="outline" onClick={applyPromoCode} disabled={promoLoading}>
                          {promoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Применить"}
                        </Button>
                      </div>
                      {promoError && <p className="text-sm text-destructive">{promoError}</p>}
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4">
                      <div>
                        <p className="font-semibold text-emerald-800">{appliedPromo.code}</p>
                        <p className="text-sm text-emerald-700">
                          Скидка {appliedPromo.discount_type === "fixed" ? `${appliedPromo.discount_value} сомонӣ` : `${appliedPromo.discount_value}%`}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" className="text-emerald-700" onClick={clearPromoCode}>
                        Убрать
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-full" onClick={() => setCheckout(false)}>
                    {t("back")}
                  </Button>
                  <Button className="flex-1 rounded-full gap-2" onClick={handleOrder} disabled={submitting}>
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {t("cartConfirmOrder")}
                  </Button>
                </div>

                <a
                  href="tel:+992979117007"
                  className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
                >
                  <Phone className="h-4 w-4" />
                  +992 979 117 007
                </a>
              </CardContent>
            </Card>

            <Card className="h-fit border-primary/20">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <TicketPercent className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Итог заказа</h3>
                </div>

                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Товары и услуги</span>
                    <span>{totalPrice} {t("somoni")}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Скидка</span>
                    <span className={discountAmount > 0 ? "text-emerald-700" : ""}>
                      -{discountAmount} {t("somoni")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Оплата</span>
                    <span>{paymentOptions.find((option) => option.value === paymentMethod)?.title}</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-muted/50 p-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>{t("cartToPay")}</span>
                    <span className="text-primary">{finalTotal} {t("somoni")}</span>
                  </div>
                  {appliedPromo && (
                    <p className="mt-2 text-sm text-emerald-700">
                      Промокод {appliedPromo.code} применен успешно
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <RecommendedProducts excludeIds={items.map((item) => item.product_id)} />
      </div>
      <Footer />
    </div>
  );
}
