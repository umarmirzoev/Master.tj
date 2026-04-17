import { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CountdownTimer from "@/components/shop/CountdownTimer";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { FavoriteButton } from "@/components/favorites/FavoritesSection";
import { useProductComparison } from "@/hooks/useProductComparison";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/hooks/useCart";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { useLanguage } from "@/contexts/LanguageContext";
import { fallbackShopCategories, fallbackShopProducts, isFallbackProductId } from "@/data/shopFallback";
import { motion } from "framer-motion";
import {
  ShoppingCart, Star, Phone, Zap, Droplets, Lightbulb, Wrench,
  Camera, Lock, Tv, PaintBucket, PlugZap, Package, ArrowRight,
  Percent, TrendingUp, Shield, Truck, Headphones,
  ChevronLeft, ChevronRight, Sparkles, Award, Search, X, Clock, Scale, Building2,
} from "lucide-react";

const ICON_MAP: Record<string, any> = {
  Zap, Droplets, Lightbulb, Wrench, Camera, Lock, Tv, PaintBucket, PlugZap, Package,
};

const PROBLEM_KEYWORDS: Record<string, string[]> = {
  "течет кран": ["смеситель", "сифон", "шланг", "сантехника", "кран"],
  "leaky faucet": ["faucet", "mixer", "plumbing"],
  "не работает розетка": ["розетка", "выключатель", "кабель", "электрика"],
  "broken socket": ["socket", "switch", "electrical"],
  "нужно поставить камеру": ["камера", "видеонаблюдение", "кронштейн", "регистратор"],
  "сломался замок": ["замок", "цилиндр", "ручка", "дверь"],
  "нужен свет": ["лампа", "светильник", "люстра", "освещение", "прожектор"],
  "для ванной": ["смеситель", "душ", "раковина", "сифон", "сантехника"],
  "для кухни": ["смеситель", "кран", "фильтр"],
  "для ремонта": ["шпаклёвка", "краска", "грунтовка", "штукатурка", "ламинат"],
  "установка кондиционера": ["кондиционер"],
  "искрит": ["розетка", "выключатель", "автомат", "кабель", "электрика"],
  "короткое замыкание": ["автомат", "узо", "кабель", "электрощиток"],
};

const POPULAR_SEARCHES = ["Смеситель", "Розетка", "Камера", "Лампа", "Замок", "Кабель", "Инструменты", "Кондиционер"];

export default function Shop() {
  const { t } = useLanguage();
  const brandName = t("brandName");
  const [categories, setCategories] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [discounted, setDiscounted] = useState<any[]>([]);
  const [hotDeals, setHotDeals] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [byCategory, setByCategory] = useState<Record<string, any[]>>({});
  const [installProduct, setInstallProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("popular");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [discountOnly, setDiscountOnly] = useState(false);
  const [installOnly, setInstallOnly] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("mc_recent_searches") || "[]"); } catch { return []; }
  });
  const { addToCart, itemCount } = useCart();
  const { compareIds } = useProductComparison();
  const searchRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLElement>(null);

  const handleCategoryCardClick = (catId: string) => {
    setSelectedCategory(catId);
    productsRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [catsRes, popRes, discRes, recRes, allRes, hotRes] = await Promise.all([
          supabase.from("shop_categories").select("*").order("sort_order"),
          supabase.from("shop_products").select("*, shop_categories(name)").eq("is_popular", true).eq("is_approved", true).limit(12),
          supabase.from("shop_products").select("*, shop_categories(name)").eq("is_discounted", true).eq("is_approved", true).limit(8),
          supabase.from("shop_products").select("*, shop_categories(name)").eq("is_approved", true).gte("rating", 4.5).order("reviews_count", { ascending: false }).limit(8),
          supabase.from("shop_products").select("*, shop_categories(name)").eq("is_approved", true).order("created_at", { ascending: false }).limit(200),
          supabase.from("shop_products").select("*, shop_categories(name)").eq("is_discounted", true).eq("is_approved", true).not("promotion_end", "is", null).gte("promotion_end", new Date().toISOString()).order("promotion_end").limit(6),
        ]);

        const shouldUseFallback = (catsRes.data?.length || 0) === 0 || (allRes.data?.length || 0) === 0;
        const cats = shouldUseFallback ? fallbackShopCategories : (catsRes.data || []);
        const all = shouldUseFallback ? fallbackShopProducts : (allRes.data || []);

        setCategories(cats);
        setPopular(shouldUseFallback ? all.filter((p: any) => p.is_popular).slice(0, 12) : (popRes.data || []));
        setDiscounted(shouldUseFallback ? all.filter((p: any) => p.is_discounted).slice(0, 8) : (discRes.data || []));
        setHotDeals(shouldUseFallback ? all.filter((p: any) => p.promotion_end).slice(0, 6) : (hotRes.data || []));
        setRecommended(shouldUseFallback ? [...all].sort((a: any, b: any) => (b.reviews_count || 0) - (a.reviews_count || 0)).slice(0, 8) : (recRes.data || []));
        setAllProducts(all);

        const grouped: Record<string, any[]> = {};
        for (const cat of cats.slice(0, 4)) {
          const items = all.filter((p: any) => p.category_id === cat.id).slice(0, 10);
          if (items.length > 0) grouped[cat.name] = items;
        }
        setByCategory(grouped);
        setInstallProduct(all.find((p: any) => p.installation_price && p.image_url) || null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (allProducts.length === 0) return;
    const prices = allProducts.map((p) => Number(p.price) || 0).filter((p) => p > 0);
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 1000;
    setPriceRange([0, maxPrice]);
  }, [allProducts]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    let expandedTerms: string[] = [q];
    for (const [prob, keys] of Object.entries(PROBLEM_KEYWORDS)) {
      if (q.includes(prob) || prob.includes(q)) expandedTerms = [...expandedTerms, ...keys];
    }
    return allProducts.filter(p => {
      const n = (p.name || "").toLowerCase();
      const c = (p.shop_categories?.name || "").toLowerCase();
      const d = (p.description || "").toLowerCase();
      return expandedTerms.some(t => n.includes(t) || c.includes(t) || d.includes(t));
    }).slice(0, 20);
  }, [searchQuery, allProducts]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 2) {
      const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem("mc_recent_searches", JSON.stringify(updated));
    }
  };

  const isSearchActive = searchQuery.trim().length > 0;
  const maxAvailablePrice = useMemo(() => {
    const prices = allProducts.map((p) => Number(p.price) || 0).filter((p) => p > 0);
    return prices.length > 0 ? Math.max(...prices) : 1000;
  }, [allProducts]);
  const categoryProductCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allProducts) counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    return counts;
  }, [allProducts]);

  const filteredProducts = useMemo(() => {
    const normalized = [...allProducts].filter((p) => {
      const price = Number(p.price) || 0;
      if (selectedCategory !== "all" && p.category_id !== selectedCategory) return false;
      if (inStockOnly && !p.in_stock) return false;
      if (discountOnly && !p.old_price) return false;
      if (installOnly && !p.installation_price) return false;
      if (price < priceRange[0] || price > priceRange[1]) return false;
      return true;
    });
    normalized.sort((a, b) => {
      if (sortBy === "price-asc") return (Number(a.price) || 0) - (Number(b.price) || 0);
      if (sortBy === "price-desc") return (Number(b.price) || 0) - (Number(a.price) || 0);
      if (sortBy === "new") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sortBy === "rating") return (Number(b.rating) || 0) - (Number(a.rating) || 0);
      return ((Number(b.reviews_count) || 0) + ((b.is_popular || b.is_discounted) ? 25 : 0)) - ((Number(a.reviews_count) || 0) + ((a.is_popular || a.is_discounted) ? 25 : 0));
    });
    return normalized;
  }, [allProducts, selectedCategory, inStockOnly, discountOnly, installOnly, priceRange, sortBy]);

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

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-emerald-50/80 to-background dark:from-primary/5 dark:via-emerald-950/30 dark:to-background" />
        <div className="container px-4 mx-auto py-14 md:py-24 relative z-10">
          <div className="max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge className="mb-5 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" /> {t("shopMarketplace")}
              </Badge>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground mb-5 leading-[1.1] tracking-tight">
                {t("shopTitle").replace(brandName, "").trim()}{" "}
                <span className="text-primary">{brandName}</span>
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-xl mb-8 leading-relaxed">
                {t("shopSubtitle")}
              </p>

              <div ref={searchRef} className="relative max-w-xl mb-8">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch(searchQuery)}
                    placeholder={t("shopSearchPlaceholder")}
                    className="pl-12 pr-10 h-14 rounded-full text-base border-border bg-background/90 backdrop-blur-sm shadow-lg focus:shadow-xl transition-shadow"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2">
                      <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                    </button>
                  )}
                </div>

                {searchFocused && !isSearchActive && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-background rounded-2xl shadow-xl border border-border p-4 z-50">
                    {recentSearches.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">{t("shopRecentSearches")}</p>
                          <button onClick={() => { setRecentSearches([]); localStorage.removeItem("mc_recent_searches"); }} className="text-xs text-primary">{t("shopClearSearch")}</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {recentSearches.map(s => (
                            <button key={s} onClick={() => { setSearchQuery(s); handleSearch(s); }} className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted text-sm text-foreground hover:bg-primary/10 transition-colors">
                              <Clock className="w-3 h-3" /> {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("shopPopularSearches")}</p>
                      <div className="flex flex-wrap gap-2">
                        {POPULAR_SEARCHES.map(s => (
                          <button key={s} onClick={() => { setSearchQuery(s); handleSearch(s); }} className="px-3 py-1.5 rounded-full bg-primary/10 text-sm text-primary hover:bg-primary/20 transition-colors">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <a href="#categories">
                  <Button size="lg" className="rounded-full gap-2 px-8 h-12 text-base shadow-lg shadow-primary/20">
                    {t("shopGoToCatalog")} <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <Link to="/masters">
                  <Button size="lg" variant="outline" className="rounded-full gap-2 px-8 h-12 text-base">
                    <Wrench className="w-4 h-4" /> {t("shopFindMaster")}
                  </Button>
                </Link>
                <Link to="/shop/promotions">
                  <Button size="lg" variant="outline" className="rounded-full gap-2 px-8 h-12 text-base">
                    <Percent className="w-4 h-4" /> Акции
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 mt-10 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><Package className="w-4 h-4 text-primary" /> {allProducts.length || 0} {t("shopProducts")}</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-amber-500" /> {categories.length || 0} {t("shopCategories")}</span>
                <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-primary" /> {t("shopDelivery")}</span>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3 max-w-3xl">
                <Link to="/shop/promotions" className="rounded-2xl border border-border bg-background/80 p-4 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-destructive/10 p-2"><Percent className="w-4 h-4 text-destructive" /></div>
                    <div>
                      <p className="font-semibold text-foreground">Акции</p>
                      <p className="text-xs text-muted-foreground">Скидки, предложения и промокоды</p>
                    </div>
                  </div>
                </Link>
                <Link to="/shop/brands" className="rounded-2xl border border-border bg-background/80 p-4 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-primary/10 p-2"><Building2 className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="font-semibold text-foreground">Бренды</p>
                      <p className="text-xs text-muted-foreground">Подборка товаров по брендам</p>
                    </div>
                  </div>
                </Link>
                <Link to="/shop/compare" className="rounded-2xl border border-border bg-background/80 p-4 backdrop-blur-sm hover:border-primary/40 hover:shadow-lg transition-all">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-500/10 p-2"><Scale className="w-4 h-4 text-amber-600" /></div>
                    <div>
                      <p className="font-semibold text-foreground">Сравнение</p>
                      <p className="text-xs text-muted-foreground">Выбрано: {compareIds.length}/4</p>
                    </div>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>
          <Link to="/cart" className="absolute top-8 right-8 hidden md:flex">
            <Button variant="outline" className="rounded-full gap-2 bg-background/80 backdrop-blur-sm border-border shadow-lg">
              <ShoppingCart className="w-4 h-4" />
              {t("shopCart")} {itemCount > 0 && <Badge className="bg-primary text-primary-foreground ml-1">{itemCount}</Badge>}
            </Button>
          </Link>
        </div>
      </section>

      {isSearchActive && (
        <section className="py-10">
          <div className="container px-4 mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">
                {t("shopSearchResults")}: "{searchQuery}" <span className="text-muted-foreground font-normal text-base">({searchResults.length})</span>
              </h2>
              <Button variant="ghost" size="sm" className="rounded-full" onClick={() => setSearchQuery("")}>
                <X className="w-4 h-4 mr-1" /> {t("shopClearSearch")}
              </Button>
            </div>
            {searchResults.length === 0 ? (
              <div className="text-center py-16">
                <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground mb-1">{t("shopNoResults")}</p>
                <p className="text-muted-foreground text-sm">{t("shopNoResultsHint")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} t={t} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {!isSearchActive && (
        <>
          <section id="categories" className="py-14">
            <div className="container px-4 mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t("shopCategoryTitle")}</h2>
                <p className="text-muted-foreground text-sm mt-1">{t("shopCategorySubtitle")}</p>
              </div>
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-36 bg-muted animate-pulse rounded-2xl" />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {categories.map((cat, i) => {
                    const Icon = ICON_MAP[cat.icon] || Package;
                    return (
                      <motion.div key={cat.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                        <div onClick={() => handleCategoryCardClick(cat.id)}>
                          <Card className="hover:shadow-xl transition-all hover:-translate-y-1.5 cursor-pointer border-border group h-full">
                            {cat.image_url && (
                              <div className="h-20 overflow-hidden rounded-t-lg">
                                <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              </div>
                            )}
                            <CardContent className="p-4 text-center">
                              <div className="w-11 h-11 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-2.5 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                              </div>
                              <p className="text-sm font-semibold text-foreground">{cat.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{categoryProductCounts[cat.id] || 0} {t("shopProducts")}</p>
                            </CardContent>
                          </Card>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section ref={productsRef} className="py-8 border-t border-border bg-muted/20">
            <div className="container px-4 mx-auto">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t("shopAllProducts")}</h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      {filteredProducts.length} {t("shopProductsCount")}
                    </p>
                  </div>
                  <div className="w-full lg:w-64">
                    <p className="text-sm font-medium text-foreground mb-2">{t("mastersSortBy")}</p>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="rounded-xl bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popular">{t("shopByPopularity")}</SelectItem>
                        <SelectItem value="price-asc">{t("shopPriceAsc")}</SelectItem>
                        <SelectItem value="price-desc">{t("shopPriceDesc")}</SelectItem>
                        <SelectItem value="new">{t("statusNew")}</SelectItem>
                        <SelectItem value="rating">{t("shopByRating")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Card className="border-border shadow-sm">
                  <CardContent className="p-5">
                    <div className="grid gap-5 lg:grid-cols-[1.2fr_1.4fr_0.8fr_0.8fr_auto]">
                      <div>
                        <p className="text-sm font-medium text-foreground mb-2">{t("shopFilterCategory")}</p>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("shopAllCategories")}</SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-medium text-foreground">{t("shopPriceRange")}</p>
                          <span className="text-xs text-muted-foreground">{priceRange[0]} - {priceRange[1]} {t("som")}</span>
                        </div>
                        <Slider value={priceRange} min={0} max={Math.max(maxAvailablePrice, 1)} step={5} minStepsBetweenThumbs={1} onValueChange={(v) => setPriceRange([v[0], v[1]] as [number, number])} />
                      </div>

                      <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 bg-background cursor-pointer">
                        <Checkbox checked={inStockOnly} onCheckedChange={(v) => setInStockOnly(!!v)} />
                        <span className="text-sm font-medium text-foreground">{t("shopInStockOnly")}</span>
                      </label>

                      <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 bg-background cursor-pointer">
                        <Checkbox checked={discountOnly} onCheckedChange={(v) => setDiscountOnly(!!v)} />
                        <span className="text-sm font-medium text-foreground">{t("shopDiscountOnly")}</span>
                      </label>

                      <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 bg-background cursor-pointer">
                        <Checkbox checked={installOnly} onCheckedChange={(v) => setInstallOnly(!!v)} />
                        <span className="text-sm font-medium text-foreground">{t("shopMasterInstall")}</span>
                      </label>

                      <Button variant="outline" className="rounded-xl" onClick={resetFilters}>{t("shopResetFilters")}</Button>
                    </div>
                  </CardContent>
                </Card>

                {filteredProducts.length === 0 ? (
                  <div className="text-center py-16 bg-background rounded-3xl border border-dashed border-border">
                    <Package className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-lg font-semibold text-foreground mb-1">{t("shopNoResults")}</p>
                    <p className="text-sm text-muted-foreground">{t("shopNoResultsHint")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredProducts.map((p) => <ProductCard key={p.id} product={p} onAdd={addToCart} t={t} />)}
                  </div>
                )}
              </div>
            </div>
          </section>

          {discounted.length > 0 && (
            <section className="py-14 bg-gradient-to-r from-red-50/80 to-orange-50/80 dark:from-red-950/10 dark:to-orange-950/10">
              <div className="container px-4 mx-auto">
                <div className="mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center"><Percent className="w-5 h-5 text-destructive" /></div>
                    {t("shopDiscounts")}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">{t("shopDiscountsSubtitle")}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {discounted.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} t={t} />)}
                </div>
              </div>
            </section>
          )}

          {hotDeals.length > 0 && (
            <section className="py-14">
              <div className="container px-4 mx-auto">
                <div className="mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">🔥</div>
                        {t("shopHotDeals")}
                      </h2>
                      <p className="text-muted-foreground text-sm mt-1">{t("shopHotDealsDesc")}</p>
                    </div>
                    {hotDeals[0]?.promotion_end && <CountdownTimer endDate={hotDeals[0].promotion_end} />}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {hotDeals.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} t={t} />)}
                </div>
              </div>
            </section>
          )}

          <section className="py-14">
            <div className="container px-4 mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-primary" /></div>
                  {t("shopPopular")}
                </h2>
                <p className="text-muted-foreground text-sm mt-1">{t("shopPopularSubtitle")}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {popular.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} t={t} />)}
              </div>
            </div>
          </section>

          {installProduct && (
            <section className="py-14 bg-gradient-to-br from-primary/5 to-emerald-50/50 dark:from-primary/5 dark:to-emerald-950/10">
              <div className="container px-4 mx-auto">
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
                    <Badge className="bg-primary/10 text-primary border-primary/20 mb-4"><Wrench className="w-3 h-3 mr-1" /> {t("shopProductInstall")}</Badge>
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">{t("shopBuyWithInstall")}</h2>
                    <p className="text-muted-foreground mb-6 leading-relaxed">{t("shopInstallDesc")}</p>
                    <Card className="border-primary/20 bg-background shadow-lg max-w-sm">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                            <img src={installProduct.image_url} alt={installProduct.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-sm">{installProduct.name}</p>
                            <p className="text-lg font-bold text-foreground mt-1">{installProduct.price} {t("somoni")}</p>
                            <p className="text-sm text-primary font-medium">+ {t("shopMasterInstall")}: {installProduct.installation_price} {t("somoni")}</p>
                          </div>
                        </div>
                        <Link to={`/shop/product/${installProduct.id}`}>
                          <Button className="w-full mt-4 rounded-full gap-2"><ShoppingCart className="w-4 h-4" /> {t("shopBuyWithInstallBtn")}</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="hidden md:flex justify-center">
                    <div className="relative">
                      <div className="w-80 h-80 rounded-3xl overflow-hidden shadow-2xl">
                        <img src={installProduct.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute -bottom-4 -right-4 bg-primary text-primary-foreground rounded-2xl px-5 py-3 shadow-xl">
                        <p className="text-sm font-bold">{t("shopInstallFrom")} {installProduct.installation_price} {t("som")}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>
          )}

          {recommended.length > 0 && (
            <section className="py-14">
              <div className="container px-4 mx-auto">
                <div className="mb-8">
                  <h2 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-orange-900/10 flex items-center justify-center"><Award className="w-5 h-5 text-amber-600" /></div>
                    {t("shopRecommended")}
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">{t("shopRecommendedSubtitle")}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {recommended.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} t={t} />)}
                </div>
              </div>
            </section>
          )}

          {Object.entries(byCategory).map(([catName, products]) => (
            <section key={catName} className="py-10 border-t border-border">
              <div className="container px-4 mx-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">{catName}</h2>
                  <Link to={`/shop/category/${categories.find(c => c.name === catName)?.id || ""}`}>
                    <Button variant="ghost" size="sm" className="text-primary gap-1 rounded-full">{t("shopAllProducts")} <ArrowRight className="w-4 h-4" /></Button>
                  </Link>
                </div>
                <HorizontalScroll>
                  {products.map(p => (
                    <div key={p.id} className="min-w-[180px] md:min-w-[220px] snap-start">
                      <ProductCard product={p} onAdd={addToCart} t={t} />
                    </div>
                  ))}
                </HorizontalScroll>
              </div>
            </section>
          ))}

          <section className="py-16 bg-foreground text-background">
            <div className="container px-4 mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{t("shopTrustTitle")}</h2>
              <p className="text-background/60 max-w-lg mx-auto mb-12">{t("shopTrustSubtitle")}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
                {[
                  { i: Shield, title: "shopTrustMasters", desc: "shopTrustMastersDesc" },
                  { i: Award, title: "shopTrustGuarantee", desc: "shopTrustGuaranteeDesc" },
                  { i: Truck, title: "shopTrustDelivery", desc: "shopTrustDeliveryDesc" },
                  { i: Headphones, title: "shopTrustSupport", desc: "shopTrustSupportDesc" }
                ].map((item, idx) => (
                  <div key={idx} className="p-6">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/20 flex items-center justify-center mb-4"><item.i className="w-7 h-7 text-primary" /></div>
                    <h3 className="font-semibold text-lg mb-1">{t(item.title)}</h3>
                    <p className="text-sm text-background/50">{t(item.desc)}</p>
                  </div>
                ))}
              </div>
              <a href="tel:+992979117007">
                <Button size="lg" className="rounded-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 h-12 text-base shadow-xl shadow-primary/30">
                  <Phone className="w-5 h-5" /> +992 979 117 007
                </Button>
              </a>
            </div>
          </section>
        </>
      )}

      <Footer />
    </div>
  );
}

function HorizontalScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  return (
    <div className="relative group/scroll">
      <button onClick={() => scroll(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 shadow-lg border border-border flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity -translate-x-3">
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div ref={ref} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2" style={{ scrollbarWidth: "none" }}>{children}</div>
      <button onClick={() => scroll(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background/90 shadow-lg border border-border flex items-center justify-center opacity-0 group-hover/scroll:opacity-100 transition-opacity translate-x-3">
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

function ProductCard({ product: p, onAdd, t }: { product: any; onAdd: (id: string) => void; t: (key: string) => string }) {
  const { toggleCompare, isComparing, compareIds, maxCompareItems } = useProductComparison();
  const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  const canAddToCart = p.in_stock;
  const stockCount = p.stock_qty ?? p.stock_quantity ?? p.quantity ?? (p.in_stock ? Math.max(3, ((p.reviews_count || 0) % 9) + 2) : 0);
  const isNewProduct = !!p.created_at && Date.now() - new Date(p.created_at).getTime() < 1000 * 60 * 60 * 24 * 45;
  const compareActive = isComparing(p.id);
  const compareDisabled = !compareActive && compareIds.length >= maxCompareItems;
  return (
    <Card className="group hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden border-border h-full flex flex-col">
      <div className="relative aspect-square bg-muted/20 overflow-hidden">
        <SmartProductImage product={p} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-2 right-2 z-10">
          <FavoriteButton itemType="product" itemId={p.id} size="sm" />
        </div>
        <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 max-w-[75%]">
          {p.is_popular && <Badge className="bg-amber-500 text-white text-[10px] shadow-md">Хит</Badge>}
          {discount > 0 && <Badge className="bg-destructive text-destructive-foreground text-[10px] shadow-md">Скидка {discount}%</Badge>}
          {isNewProduct && <Badge className="bg-sky-500 text-white text-[10px] shadow-md">Новый</Badge>}
          {p.promotion_label && <Badge className="bg-primary text-primary-foreground text-[10px] shadow-md">{p.promotion_label}</Badge>}
        </div>
        {!p.in_stock && <div className="absolute inset-0 bg-background/60 flex items-center justify-center"><Badge variant="secondary">{t("shopOutOfStock")}</Badge></div>}
      </div>
      <CardContent className="p-3 flex flex-col flex-1">
        <p className="text-[11px] text-muted-foreground mb-1">{p.shop_categories?.name || ""}</p>
        <Link to={`/shop/product/${p.id}`}>
          <h3 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary transition-colors mb-2 min-h-[2.5rem]">{p.name}</h3>
        </Link>
        <div className="flex items-center gap-1 mb-2">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs text-muted-foreground">{p.rating} ({p.reviews_count || 0})</span>
        </div>
        <div className="flex items-end gap-2 mb-3 mt-auto">
          <span className="text-lg font-bold text-foreground">{p.price} {t("som")}</span>
          {p.old_price && <span className="text-xs text-muted-foreground line-through">{p.old_price} {t("som")}</span>}
        </div>
        <div className="flex gap-1.5">
          <Link to={`/shop/product/${p.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full rounded-full text-xs h-8">{t("shopDetails")}</Button>
          </Link>
          <Button variant="outline" size="sm" className={`rounded-full text-xs h-8 px-3 ${compareActive ? "border-primary text-primary" : ""}`} onClick={() => toggleCompare(p.id)} disabled={compareDisabled}><Scale className="w-3 h-3" /></Button>
          <Button size="sm" className="rounded-full text-xs h-8 px-3" onClick={() => onAdd(p.id)} disabled={!canAddToCart}><ShoppingCart className="w-3 h-3" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}
