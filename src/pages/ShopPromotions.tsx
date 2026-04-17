import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { fallbackShopProducts } from "@/data/shopFallback";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import CountdownTimer from "@/components/shop/CountdownTimer";
import { useCart } from "@/hooks/useCart";
import { FavoriteButton } from "@/components/favorites/FavoritesSection";
import { isFallbackProductId } from "@/data/shopFallback";
import { ArrowLeft, ShoppingCart, Tag, TicketPercent, Flame, Clock3 } from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
};

export default function ShopPromotions() {
  const [products, setProducts] = useState<any[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [productsRes, promoRes] = await Promise.all([
        supabase
          .from("shop_products")
          .select("*, shop_categories(name)")
          .eq("is_approved", true)
          .eq("is_discounted", true)
          .order("promotion_end", { ascending: true })
          .limit(48),
        supabase
          .from("promo_codes")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      const dbProducts = productsRes.data || [];
      setProducts(dbProducts.length > 0 ? dbProducts : fallbackShopProducts.filter((item) => item.is_discounted));
      setPromoCodes((promoRes.data || []) as PromoCode[]);
      setLoading(false);
    };

    load();
  }, []);

  const hotDeals = useMemo(
    () => products.filter((product) => product.promotion_end && new Date(product.promotion_end) > new Date()).slice(0, 6),
    [products],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              В магазин
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">Магазин / Акции</p>
              <h1 className="text-3xl font-bold text-foreground">Акции и скидки</h1>
              <p className="mt-2 text-muted-foreground">
                Все горячие предложения магазина, товары со скидкой и активные промокоды в одном месте.
              </p>
            </div>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/shop">Открыть каталог</Link>
          </Button>
        </div>

        {promoCodes.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex items-center gap-2">
              <TicketPercent className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Активные промокоды</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {promoCodes.map((promo) => (
                <Card key={promo.id} className="border-primary/20 bg-primary/5">
                  <CardContent className="space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="bg-primary text-primary-foreground font-mono">{promo.code}</Badge>
                      <span className="text-sm font-semibold text-primary">
                        {promo.discount_type === "fixed" ? `${promo.discount_value} сомонӣ` : `${promo.discount_value}%`}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {promo.discount_type === "fixed" ? "Фиксированная скидка на заказ" : "Процентная скидка на заказ"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Использовано: {promo.times_used}/{promo.usage_limit || "∞"}
                      </span>
                      {promo.expires_at && (
                        <span>до {new Date(promo.expires_at).toLocaleDateString("ru-RU")}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {hotDeals.length > 0 && (
          <section className="mb-10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <h2 className="text-xl font-bold text-foreground">Горящие предложения</h2>
              </div>
              {hotDeals[0]?.promotion_end && <CountdownTimer endDate={hotDeals[0].promotion_end} />}
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {hotDeals.map((product) => (
                <PromoProductCard key={product.id} product={product} onAdd={addToCart} />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-4 flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Все товары со скидкой</h2>
            <Badge variant="secondary">{products.length}</Badge>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => (
                <PromoProductCard key={product.id} product={product} onAdd={addToCart} compact />
              ))}
            </div>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}

function PromoProductCard({ product, onAdd, compact = false }: { product: any; onAdd: (id: string) => void; compact?: boolean }) {
  const discount = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0;

  return (
    <Card className="overflow-hidden border-border transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className={`${compact ? "aspect-square" : "aspect-[4/3]"} relative overflow-hidden bg-muted/20`}>
        <SmartProductImage product={product} alt={product.name} className="h-full w-full object-cover" />
        <div className="absolute left-2 top-2 flex gap-2">
          {discount > 0 && <Badge className="bg-destructive text-destructive-foreground">-{discount}%</Badge>}
          {product.promotion_label && <Badge className="bg-primary text-primary-foreground">{product.promotion_label}</Badge>}
        </div>
        <div className="absolute right-2 top-2">
          <FavoriteButton itemType="product" itemId={product.id} size="sm" />
        </div>
      </div>
      <CardContent className="space-y-3 p-4">
        <p className="text-xs text-muted-foreground">{product.shop_categories?.name || "Акция"}</p>
        <Link to={`/shop/product/${product.id}`}>
          <h3 className="line-clamp-2 font-semibold text-foreground hover:text-primary">{product.name}</h3>
        </Link>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-foreground">{product.price} сомонӣ</span>
          {product.old_price && <span className="text-sm text-muted-foreground line-through">{product.old_price} сомонӣ</span>}
        </div>
        {product.promotion_end && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            До {new Date(product.promotion_end).toLocaleDateString("ru-RU")}
          </div>
        )}
        <div className="flex gap-2">
          <Button asChild variant="outline" className="flex-1 rounded-full">
            <Link to={`/shop/product/${product.id}`}>Подробнее</Link>
          </Button>
          <Button
            className="rounded-full"
            onClick={() => onAdd(product.id)}
            disabled={!product.in_stock}
          >
            <ShoppingCart className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
