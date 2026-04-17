import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { fallbackShopCategories, fallbackShopProducts, isFallbackProductId } from "@/data/shopFallback";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { FavoriteButton } from "@/components/favorites/FavoritesSection";
import { useProductComparison } from "@/hooks/useProductComparison";
import { useCart } from "@/hooks/useCart";
import { ArrowLeft, Package, Scale, Search, ShoppingCart, Star, Wrench } from "lucide-react";

export default function ShopSearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [query, setQuery] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [installOnly, setInstallOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const { addToCart } = useCart();
  const { toggleCompare, isComparing, compareIds, maxCompareItems } = useProductComparison();

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [catsRes, productsRes] = await Promise.all([
        supabase.from("shop_categories").select("*").order("sort_order"),
        supabase.from("shop_products").select("*, shop_categories(name)").eq("is_approved", true).limit(300),
      ]);

      const loadedCategories = catsRes.data && catsRes.data.length > 0 ? catsRes.data : fallbackShopCategories;
      const loadedProducts = productsRes.data && productsRes.data.length > 0 ? productsRes.data : fallbackShopProducts;

      setCategories(loadedCategories);
      setProducts(loadedProducts as any[]);

      const prices = loadedProducts.map((product: any) => Number(product.price) || 0).filter((price: number) => price > 0);
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 1000;
      setPriceRange([0, maxPrice]);
      setLoading(false);
    };

    void load();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    setSearchParams(next, { replace: true });
  }, [query, searchParams, setSearchParams]);

  const maxAvailablePrice = useMemo(() => {
    const prices = products.map((product) => Number(product.price) || 0).filter((price) => price > 0);
    return prices.length > 0 ? Math.max(...prices) : 1000;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const lowered = query.toLowerCase().trim();
    const normalized = [...products].filter((product) => {
      const name = String(product.name || "").toLowerCase();
      const description = String(product.description || "").toLowerCase();
      const category = String(product.shop_categories?.name || "").toLowerCase();
      const matchesQuery = !lowered || name.includes(lowered) || description.includes(lowered) || category.includes(lowered);
      const price = Number(product.price) || 0;

      if (!matchesQuery) return false;
      if (selectedCategory !== "all" && product.category_id !== selectedCategory) return false;
      if (inStockOnly && !product.in_stock) return false;
      if (discountOnly && !product.old_price) return false;
      if (installOnly && !product.installation_price) return false;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      return true;
    });

    normalized.sort((a, b) => {
      if (sortBy === "price-asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (sortBy === "price-desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortBy === "new") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      return ((Number(b.reviews_count) || 0) + (b.is_popular ? 15 : 0)) - ((Number(a.reviews_count) || 0) + (a.is_popular ? 15 : 0));
    });

    return normalized;
  }, [discountOnly, inStockOnly, installOnly, priceRange, products, query, selectedCategory, sortBy]);

  const resetFilters = () => {
    setSelectedCategory("all");
    setSortBy("popular");
    setInStockOnly(false);
    setDiscountOnly(false);
    setInstallOnly(false);
    setPriceRange([0, maxAvailablePrice]);
  };

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
              <p className="text-sm text-muted-foreground">Магазин / Поиск</p>
              <h1 className="text-3xl font-bold text-foreground">Поиск товаров</h1>
              <p className="mt-2 text-muted-foreground">
                Полноценный поиск по всему каталогу с фильтрами, сортировкой и быстрым переходом к нужному товару.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/shop/favorites">Избранное</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/shop/compare">Сравнение: {compareIds.length}/4</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <Card className="h-fit border-border">
            <CardContent className="space-y-5 p-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Найти товар..." className="pl-9" />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Категория</p>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все категории</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Цена</p>
                  <span className="text-xs text-muted-foreground">{priceRange[0]} - {priceRange[1]} сом.</span>
                </div>
                <Slider
                  value={priceRange}
                  min={0}
                  max={Math.max(maxAvailablePrice, 1)}
                  step={5}
                  minStepsBetweenThumbs={1}
                  onValueChange={(value) => setPriceRange([value[0], value[1]] as [number, number])}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-foreground">Сортировка</p>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Популярные</SelectItem>
                    <SelectItem value="price-asc">Сначала дешевле</SelectItem>
                    <SelectItem value="price-desc">Сначала дороже</SelectItem>
                    <SelectItem value="new">Новинки</SelectItem>
                    <SelectItem value="rating">По рейтингу</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <Checkbox checked={inStockOnly} onCheckedChange={(checked) => setInStockOnly(!!checked)} />
                <span className="text-sm font-medium text-foreground">Только в наличии</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <Checkbox checked={discountOnly} onCheckedChange={(checked) => setDiscountOnly(!!checked)} />
                <span className="text-sm font-medium text-foreground">Только со скидкой</span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-4 py-3">
                <Checkbox checked={installOnly} onCheckedChange={(checked) => setInstallOnly(!!checked)} />
                <span className="text-sm font-medium text-foreground">С установкой</span>
              </label>

              <Button variant="outline" className="w-full rounded-xl" onClick={resetFilters}>
                Сбросить фильтры
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">Найдено товаров</h2>
                <p className="text-sm text-muted-foreground">{filteredProducts.length} результат(ов) по вашему запросу</p>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div key={index} className="h-72 animate-pulse rounded-2xl bg-muted" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border bg-muted/20 py-16 text-center">
                <Package className="mx-auto mb-4 h-16 w-16 text-muted-foreground/30" />
                <p className="mb-1 text-lg font-semibold text-foreground">Ничего не найдено</p>
                <p className="text-sm text-muted-foreground">Попробуйте изменить запрос или снять часть фильтров.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {filteredProducts.map((product) => {
                  const compareActive = isComparing(product.id);
                  const compareDisabled = !compareActive && compareIds.length >= maxCompareItems;

                  return (
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
                        <p className="text-xs text-muted-foreground">{product.shop_categories?.name || "Каталог"}</p>
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
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={product.in_stock ? "font-medium text-emerald-600" : "text-muted-foreground"}>
                            {product.in_stock ? "В наличии" : "Нет в наличии"}
                          </span>
                          {product.installation_price && <span className="font-medium text-primary">С установкой</span>}
                        </div>
                        <div className="flex gap-2">
                          <Button asChild variant="outline" className="flex-1 rounded-full">
                            <Link to={`/shop/product/${product.id}`}>Подробнее</Link>
                          </Button>
                          <Button
                            variant="outline"
                            className={`rounded-full ${compareActive ? "border-primary text-primary" : ""}`}
                            onClick={() => toggleCompare(product.id)}
                            disabled={compareDisabled}
                          >
                            <Scale className="h-4 w-4" />
                          </Button>
                          <Button
                            className="rounded-full"
                            onClick={() => addToCart(product.id)}
                            disabled={!product.in_stock}
                          >
                            {product.installation_price ? <Wrench className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
