import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { fallbackShopProducts } from "@/data/shopFallback";
import { useProductComparison } from "@/hooks/useProductComparison";
import { detectProductBrand } from "@/utils/shopCatalog";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Scale, ShoppingCart, Trash2, Wrench } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { isFallbackProductId } from "@/data/shopFallback";

export default function ShopCompare() {
  const { compareIds, clearCompare, toggleCompare } = useProductComparison();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (compareIds.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const fallbackSelected = fallbackShopProducts.filter((product) => compareIds.includes(product.id));
      const dbIds = compareIds.filter((id) => !id.startsWith("fallback-"));

      let dbProducts: any[] = [];
      if (dbIds.length > 0) {
        const { data } = await supabase
          .from("shop_products")
          .select("*, shop_categories(name)")
          .in("id", dbIds);
        dbProducts = data || [];
      }

      const merged = compareIds
        .map((id) => dbProducts.find((product) => product.id === id) || fallbackSelected.find((product) => product.id === id))
        .filter(Boolean);

      setProducts(merged);
      setLoading(false);
    };

    load();
  }, [compareIds]);

  const comparisonRows = useMemo(
    () => [
      { label: "Цена", render: (product: any) => `${product.price} сомонӣ` },
      { label: "Старая цена", render: (product: any) => (product.old_price ? `${product.old_price} сомонӣ` : "—") },
      { label: "Рейтинг", render: (product: any) => `${product.rating || "—"}` },
      { label: "Отзывы", render: (product: any) => `${product.reviews_count || 0}` },
      { label: "Категория", render: (product: any) => product.shop_categories?.name || "—" },
      { label: "Бренд", render: (product: any) => detectProductBrand(product) || "—" },
      { label: "Наличие", render: (product: any) => (product.in_stock ? "В наличии" : "Нет в наличии") },
      { label: "Установка", render: (product: any) => (product.installation_price ? `${product.installation_price} сомонӣ` : "Нет") },
      { label: "Промо", render: (product: any) => product.promotion_label || "—" },
    ],
    [],
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              В магазин
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">Магазин / Сравнение товаров</p>
              <h1 className="text-3xl font-bold text-foreground">Сравнение товаров</h1>
              <p className="mt-2 text-muted-foreground">
                Сравните до 4 товаров по цене, бренду, рейтингу, наличию и установке.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="rounded-full" onClick={clearCompare}>
              Очистить
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/shop">Добавить товары</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-80 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-16 text-center">
              <Scale className="mx-auto mb-4 h-16 w-16 text-primary/40" />
              <h2 className="mb-2 text-2xl font-bold text-foreground">Нет товаров для сравнения</h2>
              <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
                На карточке товара нажмите кнопку сравнения, и здесь появится удобная таблица характеристик.
              </p>
              <Button asChild className="rounded-full">
                <Link to="/shop">Перейти в магазин</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-4">
              {products.map((product) => (
                <Card key={product.id} className="overflow-hidden border-border">
                  <div className="relative aspect-square overflow-hidden bg-muted/20">
                    <SmartProductImage product={product} alt={product.name} className="h-full w-full object-cover" />
                    <div className="absolute left-2 top-2 flex flex-wrap gap-2">
                      {product.promotion_label && <Badge className="bg-primary text-primary-foreground">{product.promotion_label}</Badge>}
                    </div>
                  </div>
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs text-muted-foreground">{product.shop_categories?.name || "Товар"}</p>
                    <Link to={`/shop/product/${product.id}`}>
                      <h3 className="line-clamp-2 font-semibold text-foreground hover:text-primary">{product.name}</h3>
                    </Link>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 rounded-full"
                        onClick={() => addToCart(product.id)}
                        disabled={!product.in_stock}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" className="rounded-full" onClick={() => toggleCompare(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-4 text-left text-sm font-semibold text-foreground">Параметр</th>
                      {products.map((product) => (
                        <th key={product.id} className="p-4 text-left text-sm font-semibold text-foreground">
                          {product.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.label} className="border-b border-border/60">
                        <td className="p-4 text-sm font-medium text-foreground">{row.label}</td>
                        {products.map((product) => (
                          <td key={`${product.id}-${row.label}`} className="p-4 text-sm text-muted-foreground">
                            {row.label === "Установка" && row.render(product) !== "Нет" ? (
                              <span className="inline-flex items-center gap-1 text-primary">
                                <Wrench className="h-3.5 w-3.5" />
                                {row.render(product)}
                              </span>
                            ) : (
                              row.render(product)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
