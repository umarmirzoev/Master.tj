import { useEffect, useState } from "react";
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
import { ShoppingCart, Star, ArrowLeft, Package, Phone, Percent, Wrench, Scale } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  getFallbackCategoryById,
  getFallbackProductsByCategoryId,
  isFallbackCategoryId,
  isFallbackProductId,
} from "@/data/shopFallback";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { FavoriteButton } from "@/components/favorites/FavoritesSection";
import { useProductComparison } from "@/hooks/useProductComparison";

export default function ShopCategory() {
  const { id } = useParams();
  const [category, setCategory] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("popular");
  const [discountOnly, setDiscountOnly] = useState(false);
  const [installOnly, setInstallOnly] = useState(false);
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const { toggleCompare, isComparing, compareIds, maxCompareItems } = useProductComparison();

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      if (isFallbackCategoryId(id)) {
        setCategory(getFallbackCategoryById(id));
        setProducts(getFallbackProductsByCategoryId(id));
        setLoading(false);
        return;
      }

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

  const filtered = products.filter((product) => {
    if (discountOnly && !(product.is_discounted || product.old_price)) return false;
    if (installOnly && !product.installation_price) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "price_desc") return b.price - a.price;
    if (sort === "new") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
    return (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0);
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link to="/shop">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{category?.name || "Категория"}</h1>
            <p className="text-sm text-muted-foreground">
              {sorted.length} из {products.length} {t("shopProducts")}
            </p>
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/shop" className="hover:text-primary">{t("navShop")}</Link>
          <span>/</span>
          <span className="text-foreground">{category?.name || t("shopCategory")}</span>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-48 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t("shopByPopularity")}</SelectItem>
              <SelectItem value="price_asc">{t("shopPriceAsc")}</SelectItem>
              <SelectItem value="price_desc">{t("shopPriceDesc")}</SelectItem>
              <SelectItem value="new">{t("statusNew")}</SelectItem>
              <SelectItem value="rating">{t("shopByRating")}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={discountOnly ? "default" : "outline"}
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => setDiscountOnly(!discountOnly)}
          >
            <Percent className="h-3.5 w-3.5" />
            {t("shopDiscountOnly")}
          </Button>
          <Button
            variant={installOnly ? "default" : "outline"}
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => setInstallOnly(!installOnly)}
          >
            <Wrench className="h-3.5 w-3.5" />
            {t("shopMasterInstall")}
          </Button>
          <Link to="/shop/compare" className="ml-auto">
            <Button variant="outline" size="sm" className="rounded-full gap-1.5">
              <Scale className="h-3.5 w-3.5" />
              Сравнение: {compareIds.length}/4
            </Button>
          </Link>
          <a href="tel:+992979117007" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
            <Phone className="h-3 w-3" />
            +992 979 117 007
          </a>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/20 py-16 text-center">
            <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
            <p className="mb-1 text-lg font-semibold text-foreground">{t("shopNoResults")}</p>
            <p className="mb-5 text-sm text-muted-foreground">Попробуйте снять фильтры или перейти в общий каталог.</p>
            <Link to="/shop">
              <Button className="rounded-full">{t("shopBackToShop")}</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {sorted.map((product) => {
              const discount = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0;
              const stockCount =
                product.stock_qty ??
                product.stock_quantity ??
                product.quantity ??
                (product.in_stock ? Math.max(3, ((product.reviews_count || 0) % 9) + 2) : 0);
              const isNewProduct = !!product.created_at && Date.now() - new Date(product.created_at).getTime() < 1000 * 60 * 60 * 24 * 45;
              const compareActive = isComparing(product.id);
              const compareDisabled = !compareActive && compareIds.length >= maxCompareItems;

              return (
                <Card key={product.id} className="group overflow-hidden border-border transition-all hover:shadow-lg">
                  <div className="relative aspect-square overflow-hidden bg-muted/20">
                    <SmartProductImage product={product} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute right-2 top-2 z-10">
                      <FavoriteButton itemType="product" itemId={product.id} size="sm" />
                    </div>
                    <div className="absolute left-2 top-2 flex max-w-[75%] flex-wrap gap-1.5">
                      {product.is_popular && <Badge className="bg-amber-500 text-white text-[10px]">Хит</Badge>}
                      {discount > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px]">Скидка {discount}%</Badge>}
                      {isNewProduct && <Badge className="bg-sky-500 text-white text-[10px]">Новый</Badge>}
                      {product.promotion_label && <Badge className="bg-primary text-primary-foreground text-[10px]">{product.promotion_label}</Badge>}
                    </div>
                    {product.installation_price && (
                      <Badge className="absolute bottom-2 left-2 bg-primary/90 text-primary-foreground text-[10px]">
                        Установка
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <Link to={`/shop/product/${product.id}`}>
                      <h3 className="mb-2 min-h-[2.5rem] line-clamp-2 text-sm font-medium text-foreground transition-colors hover:text-primary">
                        {product.name}
                      </h3>
                    </Link>
                    <div className="mb-2 flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs text-muted-foreground">{product.rating}</span>
                      {!product.in_stock && <Badge variant="secondary" className="ml-auto text-[10px]">Нет в наличии</Badge>}
                    </div>
                    <div className="mb-2 flex items-center justify-between gap-2 text-[11px]">
                      <span className={`font-medium ${product.in_stock ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {product.in_stock ? `В наличии: ${stockCount} шт.` : t("shopOutOfStock")}
                      </span>
                      {product.installation_price && <span className="font-medium text-primary">Можно с установкой</span>}
                    </div>
                    <div className="mb-3 flex items-end gap-2">
                      <span className="text-lg font-bold text-foreground">{product.price} с.</span>
                      {product.old_price && <span className="text-xs text-muted-foreground line-through">{product.old_price} с.</span>}
                    </div>
                    <div className="flex gap-1.5">
                      <Link to={`/shop/product/${product.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full rounded-full text-xs h-8">Подробнее</Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`rounded-full text-xs h-8 px-3 ${compareActive ? "border-primary text-primary" : ""}`}
                        onClick={() => toggleCompare(product.id)}
                        disabled={compareDisabled}
                      >
                        <Scale className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-full text-xs h-8 px-3"
                        onClick={() => addToCart(product.id)}
                        disabled={!product.in_stock}
                      >
                        <ShoppingCart className="h-3 w-3" />
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
