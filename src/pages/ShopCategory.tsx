import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCart } from "@/hooks/useCart";
import RecentlyViewedProducts from "@/components/shop/RecentlyViewedProducts";
import { ShoppingCart, Star, ArrowLeft, Package, Phone, Percent } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// Страница категории магазина показывает товары внутри одной категории с сортировкой и фильтром скидок.
export default function ShopCategory() {
  const { id } = useParams();
  const [category, setCategory] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("popular");
  const [discountOnly, setDiscountOnly] = useState(false);
  const { addToCart } = useCart();
  const { t } = useLanguage();

  // Загружаем данные категории и все товары внутри неё при переходе на страницу.
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [catRes, prodRes] = await Promise.all([
        supabase.from("shop_categories").select("*").eq("id", id!).single(),
        supabase.from("shop_products").select("*, shop_categories(name)").eq("category_id", id!),
      ]);
      setCategory(catRes.data);
      setProducts(prodRes.data || []);
      setLoading(false);
    };
    if (id) load();
  }, [id]);

  // Сначала отфильтровываем товары по скидкам, затем применяем выбранную сортировку.
  const filtered = discountOnly ? products.filter(p => p.is_discounted || p.old_price) : products;
  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
    return (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0);
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 mx-auto py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/shop"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="w-5 h-5" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{category?.name || "Категория"}</h1>
            <p className="text-sm text-muted-foreground">{products.length} товаров</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap mb-4">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-48 rounded-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t("shopByPopularity")}</SelectItem>
              <SelectItem value="price_asc">{t("shopPriceAsc")}</SelectItem>
              <SelectItem value="price_desc">{t("shopPriceDesc")}</SelectItem>
              <SelectItem value="rating">{t("shopByRating")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={discountOnly ? "default" : "outline"}
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => setDiscountOnly(!discountOnly)}
          >
            <Percent className="w-3.5 h-3.5" /> {t("shopDiscountOnly")}
          </Button>
          <a href="tel:+992979117007" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 ml-auto">
            <Phone className="w-3 h-3" /> +992 979 117 007
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />)}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">Товары скоро появятся</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sorted.map(p => {
              const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
              return (
                <Card key={p.id} className="group hover:shadow-lg transition-all overflow-hidden border-border">
                  <div className="relative aspect-square bg-muted/20 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-16 h-16 text-muted-foreground/30" /></div>
                    )}
                    {discount > 0 && <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">-{discount}%</Badge>}
                  </div>
                  <CardContent className="p-3">
                    <Link to={`/shop/product/${p.id}`}>
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary transition-colors mb-2 min-h-[2.5rem]">{p.name}</h3>
                    </Link>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-muted-foreground">{p.rating}</span>
                      {!p.in_stock && <Badge variant="secondary" className="text-[10px] ml-auto">Нет в наличии</Badge>}
                    </div>
                    <div className="flex items-end gap-2 mb-3">
                      <span className="text-lg font-bold text-foreground">{p.price} с.</span>
                      {p.old_price && <span className="text-xs text-muted-foreground line-through">{p.old_price} с.</span>}
                    </div>
                    <div className="flex gap-1.5">
                      <Link to={`/shop/product/${p.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full rounded-full text-xs h-8">Подробнее</Button>
                      </Link>
                      <Button size="sm" className="rounded-full text-xs h-8 px-3" onClick={() => addToCart(p.id)} disabled={!p.in_stock}>
                        <ShoppingCart className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <RecentlyViewedProducts />
      </div>
      <Footer />
    </div>
  );
}
