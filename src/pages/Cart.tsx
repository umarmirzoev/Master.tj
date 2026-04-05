import { useState } from "react";
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
import { ShoppingCart, Minus, Plus, Trash2, ArrowLeft, Package, Phone, Wrench, CheckCircle, Loader2 } from "lucide-react";

// Страница корзины показывает выбранные товары и оформляет заказ магазина.
export default function CartPage() {
  const { items, loading, totalPrice, updateQuantity, removeFromCart, toggleInstallation, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkout, setCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "", comments: "" });

  // При наличии профиля сразу подставляем имя и телефон в поля оформления.
  useState(() => {
    if (profile) setForm(f => ({ ...f, name: profile.full_name || "", phone: profile.phone || "" }));
  });

  // Создаём заказ магазина, добавляем позиции и очищаем корзину после успеха.
  const handleOrder = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!form.name || !form.phone || !form.address) {
      toast({ title: t("cartFillRequired"), variant: "destructive" }); return;
    }
    setSubmitting(true);
    const { data: order, error } = await supabase.from("shop_orders").insert({ user_id: user.id, total: totalPrice, delivery_address: form.address, phone: form.phone, customer_name: form.name, comments: form.comments, status: "pending" }).select().single();
    if (error || !order) { toast({ title: t("error"), description: error?.message, variant: "destructive" }); setSubmitting(false); return; }
    const orderItems = items.map(item => ({ order_id: order.id, product_id: item.product_id, quantity: item.quantity, price: (item as any).product?.price || 0, include_installation: item.include_installation, installation_price: item.include_installation ? ((item as any).product?.installation_price || 0) : 0 }));
    await supabase.from("shop_order_items").insert(orderItems);
    await supabase.from("notifications").insert({ user_id: user.id, title: t("cartOrderSuccess"), message: `${t("cartOrderSuccessDesc")}`, type: "shop_order" });
    await clearCart();
    setSubmitting(false);
    toast({ title: t("cartOrderSuccess") + " ✓", description: t("cartOrderSuccessDesc") });
    setCheckout(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 mx-auto py-8 max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/shop"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <h1 className="text-2xl font-bold text-foreground">{t("cartTitle")}</h1>
          {items.length > 0 && <Badge variant="secondary">{items.length}</Badge>}
        </div>

        {/* Здесь по состоянию показывается загрузка, пустая корзина, список товаров или форма оформления. */}
        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingCart className="w-20 h-20 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">{t("cartEmpty")}</h2>
            <p className="text-muted-foreground mb-6">{t("cartEmptyHint")}</p>
            <Link to="/shop"><Button className="rounded-full">{t("cartGoToShop")}</Button></Link>
          </div>
        ) : !checkout ? (
          <div className="space-y-4">
            {items.map(item => {
              const p = (item as any).product;
              if (!p) return null;
              return (
                <Card key={item.id} className="border-border">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-20 h-20 rounded-xl bg-muted/30 flex-shrink-0 flex items-center justify-center">
                        {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain rounded-xl" /> : <Package className="w-8 h-8 text-muted-foreground/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link to={`/shop/product/${p.id}`}><h3 className="text-sm font-medium text-foreground hover:text-primary line-clamp-2">{p.name}</h3></Link>
                        <p className="text-lg font-bold text-foreground mt-1">{p.price} {t("som")} <span className="text-xs text-muted-foreground font-normal">× {item.quantity}</span></p>
                        {p.installation_price && (
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <Checkbox checked={item.include_installation} onCheckedChange={() => toggleInstallation(item.product_id)} />
                            <span className="text-xs text-muted-foreground flex items-center gap-1"><Wrench className="w-3 h-3" /> {t("cartInstallation")} +{p.installation_price} {t("som")}</span>
                          </label>
                        )}
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.product_id)}><Trash2 className="w-4 h-4" /></Button>
                        <div className="flex items-center border border-border rounded-full">
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.product_id, item.quantity - 1)}><Minus className="w-3 h-3" /></Button>
                          <span className="w-6 text-center text-sm">{item.quantity}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none" onClick={() => updateQuantity(item.product_id, item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
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
                <Button className="w-full mt-4 rounded-full h-12 text-base" onClick={() => user ? setCheckout(true) : navigate("/auth")}>{t("cartCheckout")}</Button>
                <Link to="/shop" className="block text-center text-sm text-muted-foreground hover:text-primary mt-3">← {t("cartContinueShopping")}</Link>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="border-border">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-foreground">{t("cartCheckout")}</h2>
              <div><label className="text-sm font-medium block mb-1.5">{t("cartName")} *</label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="text-sm font-medium block mb-1.5">{t("cartPhone")} *</label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} type="tel" required /></div>
              <div><label className="text-sm font-medium block mb-1.5">{t("cartDeliveryAddress")} *</label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required /></div>
              <div><label className="text-sm font-medium block mb-1.5">{t("cartComments")}</label><Textarea value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })} rows={2} /></div>
              <div className="p-4 bg-muted/50 rounded-xl">
                <div className="flex justify-between font-bold text-lg"><span>{t("cartToPay")}</span><span className="text-primary">{totalPrice} {t("somoni")}</span></div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-full" onClick={() => setCheckout(false)}>{t("back")}</Button>
                <Button className="flex-1 rounded-full gap-2" onClick={handleOrder} disabled={submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} {t("cartConfirmOrder")}
                </Button>
              </div>
              <a href="tel:+992979117007" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"><Phone className="w-4 h-4" /> +992 979 117 007</a>
            </CardContent>
          </Card>
        )}

        {/* В конце страницы показываем рекомендуемые товары для допродажи. */}
        <RecommendedProducts excludeIds={items.map(i => i.product_id)} />
      </div>
      <Footer />
    </div>
  );
}
