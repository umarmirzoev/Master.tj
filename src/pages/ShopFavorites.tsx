import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fallbackShopProducts, isFallbackProductId } from "@/data/shopFallback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { FavoriteButton, useFavoriteContext } from "@/components/favorites/FavoritesSection";
import { ArrowLeft, Heart, Loader2, ShoppingCart, Star } from "lucide-react";
import { useCart } from "@/hooks/useCart";

export default function ShopFavorites() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const { addToCart } = useCart();
  const { favorites } = useFavoriteContext();

  const productFavoriteIds = useMemo(
    () => favorites.filter((favorite) => favorite.item_type === "product").map((favorite) => favorite.item_id),
    [favorites]
  );

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      if (productFavoriteIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("shop_products")
        .select("*, shop_categories(name)")
        .in("id", productFavoriteIds);

      const ordered = productFavoriteIds
        .map((id) => (data || []).find((product) => product.id === id) || fallbackShopProducts.find((product) => product.id === id))
        .filter(Boolean);

      setProducts(ordered);
      setLoading(false);
    };

    void load();
  }, [productFavoriteIds, user]);

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
              <p className="text-sm text-muted-foreground">Магазин / Избранное</p>
              <h1 className="text-3xl font-bold text-foreground">Избранные товары</h1>
              <p className="mt-2 text-muted-foreground">
                Здесь собраны все товары, которые вы сохранили для быстрого возврата и покупки.
              </p>
            </div>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/shop/search">Поиск товаров</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-16 text-center">
              <Heart className="mx-auto mb-4 h-16 w-16 text-primary/40" />
              <h2 className="mb-2 text-2xl font-bold text-foreground">Нужно войти в аккаунт</h2>
              <p className="mb-6 text-muted-foreground">После входа здесь появятся ваши сохраненные товары.</p>
              <Button asChild className="rounded-full">
                <Link to="/auth">Войти</Link>
              </Button>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-16 text-center">
              <Heart className="mx-auto mb-4 h-16 w-16 text-primary/40" />
              <h2 className="mb-2 text-2xl font-bold text-foreground">Пока нет избранных товаров</h2>
              <p className="mb-6 text-muted-foreground">Добавляйте товары в избранное с карточек магазина, и они появятся здесь.</p>
              <Button asChild className="rounded-full">
                <Link to="/shop">Открыть магазин</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <Card key={product.id} className="group overflow-hidden border-border transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-square overflow-hidden bg-muted/20">
                  <SmartProductImage
                    product={product}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute right-2 top-2">
                    <FavoriteButton itemType="product" itemId={product.id} size="sm" />
                  </div>
                </div>
                <CardContent className="space-y-3 p-4">
                  <p className="text-xs text-muted-foreground">{product.shop_categories?.name || "Избранное"}</p>
                  <Link to={`/shop/product/${product.id}`}>
                    <h3 className="line-clamp-2 font-semibold text-foreground hover:text-primary">{product.name}</h3>
                  </Link>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {product.rating || "—"} ({product.reviews_count || 0})
                  </div>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-foreground">{product.price} сомони</span>
                    {product.old_price && <span className="text-sm text-muted-foreground line-through">{product.old_price} сомони</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {product.in_stock ? `В наличии${product.stock_qty ? `: ${product.stock_qty} шт.` : ""}` : "Сейчас нет в наличии"}
                  </p>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" className="flex-1 rounded-full">
                      <Link to={`/shop/product/${product.id}`}>Подробнее</Link>
                    </Button>
                    <Button
                      className="rounded-full"
                      onClick={() => addToCart(product.id)}
                      disabled={!product.in_stock}
                    >
                      <ShoppingCart className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
