import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { fallbackShopProducts, isFallbackProductId } from "@/data/shopFallback";
import { detectProductBrand } from "@/utils/shopCatalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { useCart } from "@/hooks/useCart";
import { FavoriteButton } from "@/components/favorites/FavoritesSection";
import { ArrowLeft, Building2, ShoppingCart } from "lucide-react";

export default function ShopBrands() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedBrand = searchParams.get("brand") || "";
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("shop_products")
        .select("*, shop_categories(name)")
        .eq("is_approved", true)
        .limit(300);

      setProducts((data && data.length > 0 ? data : fallbackShopProducts) as any[]);
      setLoading(false);
    };

    load();
  }, []);

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => {
      const brand = detectProductBrand(product);
      if (!brand) return;
      counts.set(brand, (counts.get(brand) || 0) + 1);
    });

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (!selectedBrand) return [];
    return products.filter((product) => detectProductBrand(product) === selectedBrand);
  }, [products, selectedBrand]);

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
              <p className="text-sm text-muted-foreground">Магазин / Бренды</p>
              <h1 className="text-3xl font-bold text-foreground">Бренды</h1>
              <p className="mt-2 text-muted-foreground">
                Подборка брендов, которые уже есть в каталоге магазина, с быстрым переходом к товарам каждого бренда.
              </p>
            </div>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/shop">Открыть каталог</Link>
          </Button>
        </div>

        <section className="mb-10">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Все бренды</h2>
            <Badge variant="secondary">{brands.length}</Badge>
          </div>
          {loading ? (
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
              {brands.map((brand) => (
                <button
                  key={brand.name}
                  onClick={() => setSearchParams(brand.name === selectedBrand ? {} : { brand: brand.name })}
                  className={`rounded-2xl border p-4 text-left transition ${
                    brand.name === selectedBrand
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="font-semibold text-foreground">{brand.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{brand.count} товар(а)</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {selectedBrand && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedBrand}</h2>
                <p className="text-sm text-muted-foreground">Товары этого бренда в каталоге</p>
              </div>
              <Button variant="outline" className="rounded-full" onClick={() => setSearchParams({})}>
                Сбросить
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden border-border transition-all hover:-translate-y-1 hover:shadow-xl">
                  <div className="relative aspect-square overflow-hidden bg-muted/20">
                    <SmartProductImage product={product} alt={product.name} className="h-full w-full object-cover" />
                    <div className="absolute right-2 top-2">
                      <FavoriteButton itemType="product" itemId={product.id} size="sm" />
                    </div>
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs text-muted-foreground">{product.shop_categories?.name || selectedBrand}</p>
                    <Link to={`/shop/product/${product.id}`}>
                      <h3 className="line-clamp-2 font-semibold text-foreground hover:text-primary">{product.name}</h3>
                    </Link>
                    <div className="flex items-end gap-2">
                      <span className="text-2xl font-bold text-foreground">{product.price} сомонӣ</span>
                      {product.old_price && <span className="text-sm text-muted-foreground line-through">{product.old_price} сомонӣ</span>}
                    </div>
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
          </section>
        )}
      </div>
      <Footer />
    </div>
  );
}
