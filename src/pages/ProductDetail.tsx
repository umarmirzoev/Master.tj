import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useCart } from "@/hooks/useCart";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import RecentlyViewedProducts from "@/components/shop/RecentlyViewedProducts";
import RecommendedProducts from "@/components/shop/RecommendedProducts";
import CountdownTimer from "@/components/shop/CountdownTimer";
import { motion } from "framer-motion";
import {
  ShoppingCart, Star, Package, Phone, Minus, Plus,
  CheckCircle, Wrench, Truck, User, Award, ArrowRight,
} from "lucide-react";

// Category cross-sell mapping: categoryId → array of related categoryIds
const CROSS_SELL_MAP: Record<string, string[]> = {
  // Сантехника → Смесители, Кабели
  "40c41a25-c164-40e7-9908-df63a9a41ead": ["0fcc06dc-67d5-4499-b3fd-dc4b9f1e8823", "ff22bf62-7641-4821-b86a-2c9ac3d9d306"],
  // Смесители → Сантехника, Инструменты
  "0fcc06dc-67d5-4499-b3fd-dc4b9f1e8823": ["40c41a25-c164-40e7-9908-df63a9a41ead", "89357170-58f1-4a2c-93b7-c4b13c5529ee"],
  // Видеонаблюдение → Камеры, Кабели
  "6eb6408d-af8a-4ec2-9dcb-8b0b177f9156": ["ece5830d-1ed7-40c0-9afd-8f6c10f8d0d1", "ff22bf62-7641-4821-b86a-2c9ac3d9d306"],
  // Камеры → Видеонаблюдение, Кабели
  "ece5830d-1ed7-40c0-9afd-8f6c10f8d0d1": ["6eb6408d-af8a-4ec2-9dcb-8b0b177f9156", "ff22bf62-7641-4821-b86a-2c9ac3d9d306"],
  // Электрика → Розетки, Кабели
  "04b26516-b7ee-4f50-b5b6-0882f32add7f": ["3f26ccc0-5b35-427a-b680-6b4479ed912e", "ff22bf62-7641-4821-b86a-2c9ac3d9d306"],
  // Розетки → Электрика, Кабели, Освещение
  "3f26ccc0-5b35-427a-b680-6b4479ed912e": ["04b26516-b7ee-4f50-b5b6-0882f32add7f", "ff22bf62-7641-4821-b86a-2c9ac3d9d306", "9e7a868a-1e17-4e6c-a8be-b61a2392f1cf"],
  // Кабели → Электрика, Розетки
  "ff22bf62-7641-4821-b86a-2c9ac3d9d306": ["04b26516-b7ee-4f50-b5b6-0882f32add7f", "3f26ccc0-5b35-427a-b680-6b4479ed912e"],
  // Освещение → Розетки, Электрика
  "9e7a868a-1e17-4e6c-a8be-b61a2392f1cf": ["3f26ccc0-5b35-427a-b680-6b4479ed912e", "04b26516-b7ee-4f50-b5b6-0882f32add7f"],
  // Замки → Инструменты
  "dea4f35d-eb00-4602-8cc0-d6023ca3cdb4": ["89357170-58f1-4a2c-93b7-c4b13c5529ee"],
  // Инструменты → Товары для ремонта
  "89357170-58f1-4a2c-93b7-c4b13c5529ee": ["f8b82bed-62a8-4120-b77c-93669c8cb67d"],
  // Товары для ремонта → Инструменты, Освещение
  "f8b82bed-62a8-4120-b77c-93669c8cb67d": ["89357170-58f1-4a2c-93b7-c4b13c5529ee", "9e7a868a-1e17-4e6c-a8be-b61a2392f1cf"],
  // Бытовая техника → Электрика, Кабели
  "2e2d0a5b-35e8-4c38-9631-2ee24df3150e": ["04b26516-b7ee-4f50-b5b6-0882f32add7f", "ff22bf62-7641-4821-b86a-2c9ac3d9d306"],
};

function ProductCard({ product, onAddToCart, t }: { product: any; onAddToCart: (id: string) => void; t: (k: string) => string }) {
  return (
    <Card className="hover:shadow-lg transition-all overflow-hidden border-border group shrink-0 w-[180px] sm:w-auto">
      <Link to={`/shop/product/${product.id}`}>
        <div className="aspect-square bg-muted/20 flex items-center justify-center overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <Package className="w-12 h-12 text-muted-foreground/30" />
          )}
        </div>
      </Link>
      <CardContent className="p-3 space-y-2">
        <Link to={`/shop/product/${product.id}`}>
          <h3 className="text-sm font-medium text-foreground hover:text-primary line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
        </Link>
        <div className="flex items-center gap-1">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span className="text-xs text-muted-foreground">{product.rating || "4.5"}</span>
        </div>
        <div className="flex items-end gap-1.5">
          <span className="text-lg font-bold text-foreground">{product.price}</span>
          <span className="text-xs text-muted-foreground mb-0.5">{t("currencySomoni")}</span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 rounded-full text-xs h-8 gap-1" onClick={(e) => { e.preventDefault(); onAddToCart(product.id); }}>
            <ShoppingCart className="w-3 h-3" /> {t("shopAddToCart")}
          </Button>
          <Link to={`/shop/product/${product.id}`}>
            <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-2.5">
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// Страница товара показывает подробную карточку продукта, продавца, допуслуги и рекомендации.
export default function ProductDetail() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [product, setProduct] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [boughtTogether, setBoughtTogether] = useState<any[]>([]);
  const [seller, setSeller] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [withInstall, setWithInstall] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const { addToCart } = useCart();
  const { addProduct: addToRecentlyViewed } = useRecentlyViewed();

  useEffect(() => {
    // Загружаем товар, продавца, похожие товары и кросс-селл-подборку.
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("shop_products")
        .select("*, shop_categories(name)")
        .eq("id", id!)
        .single();
      setProduct(data);
      setActiveImage(0);

      if (data?.master_id) {
        const { data: masterData } = await supabase
          .from("master_listings")
          .select("*")
          .eq("user_id", data.master_id)
          .single();
        setSeller(masterData);
      } else {
        setSeller(null);
      }

      if (data?.category_id) {
        // Related: same category, different product, sorted by rating
        const { data: rel } = await supabase
          .from("shop_products")
          .select("*, shop_categories(name)")
          .eq("category_id", data.category_id)
          .neq("id", id!)
          .order("rating", { ascending: false })
          .limit(8);
        setRelated(rel || []);

        // Frequently bought together: from cross-sell categories
        const crossCats = CROSS_SELL_MAP[data.category_id] || [];
        if (crossCats.length > 0) {
          const { data: cross } = await supabase
            .from("shop_products")
            .select("*, shop_categories(name)")
            .in("category_id", crossCats)
            .eq("in_stock", true)
            .order("is_popular", { ascending: false })
            .limit(8);
          setBoughtTogether(cross || []);
        } else {
          setBoughtTogether([]);
        }
      }
      setLoading(false);

      // Track recently viewed
      if (data) {
        addToRecentlyViewed({
          id: data.id,
          name: data.name,
          image_url: data.image_url,
          price: data.price,
          old_price: data.old_price,
          rating: data.rating,
        });
      }
    };
    if (id) load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 mx-auto py-16">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="aspect-square bg-muted animate-pulse rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 bg-muted animate-pulse rounded-lg w-3/4" />
              <div className="h-6 bg-muted animate-pulse rounded-lg w-1/2" />
              <div className="h-10 bg-muted animate-pulse rounded-lg w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 mx-auto py-16 text-center">
          <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">{t("shopProductNotFound")}</p>
          <Link to="/shop"><Button className="mt-4 rounded-full">{t("shopBackToShop")}</Button></Link>
        </div>
      </div>
    );
  }

  const galleryImages: string[] = [];
  if (product.image_url) galleryImages.push(product.image_url);
  if (product.images && Array.isArray(product.images)) {
    for (const img of product.images) {
      if (img && !galleryImages.includes(img)) galleryImages.push(img);
    }
  }

  const discount = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0;
  const totalPrice = product.price * qty + (withInstall && product.installation_price ? product.installation_price : 0);
  const specs = typeof product.specs === "object" && product.specs !== null ? product.specs : {};

  // Быстрая покупка кладёт товар в корзину и переводит пользователя к оформлению.
  const handleBuyNow = async () => {
    await addToCart(product.id, withInstall);
    window.location.href = "/cart";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 mx-auto py-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/shop" className="hover:text-primary">{t("navShop")}</Link>
          <span>/</span>
          <Link to={`/shop/category/${product.category_id}`} className="hover:text-primary">{product.shop_categories?.name}</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-3">
            <div className="aspect-square bg-muted/20 rounded-2xl border border-border flex items-center justify-center overflow-hidden relative">
              {galleryImages.length > 0 ? (
                <img src={galleryImages[activeImage] || galleryImages[0]} alt={product.name} className="w-full h-full object-cover transition-all duration-300" />
              ) : (
                <Package className="w-32 h-32 text-muted-foreground/20" />
              )}
              {discount > 0 && <Badge className="absolute top-4 left-4 bg-destructive text-destructive-foreground text-sm px-3">-{discount}%</Badge>}
              {product.seller_type === "master" && (
                <Badge className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs gap-1"><Award className="w-3 h-3" /> {t("shopFromMaster")}</Badge>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((img, i) => (
                  <button key={i} onClick={() => setActiveImage(i)} className={`w-16 h-16 md:w-20 md:h-20 rounded-xl border-2 overflow-hidden shrink-0 transition-all ${activeImage === i ? "border-primary shadow-md" : "border-border hover:border-primary/50"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div>
              <p className="text-sm text-primary font-medium mb-1">{product.shop_categories?.name}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.floor(product.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">{product.rating} ({product.reviews_count} {t("shopReviews")})</span>
            </div>

            <div className="flex items-end gap-3">
              <span className="text-3xl font-bold text-foreground">{product.price} {t("currencySomoni")}</span>
              {product.old_price && <span className="text-lg text-muted-foreground line-through">{product.old_price} с.</span>}
            </div>

            {product.promotion_end && new Date(product.promotion_end) > new Date() && (
              <CountdownTimer endDate={product.promotion_end} />
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {product.in_stock ? (
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"><CheckCircle className="w-3 h-3 mr-1" />{t("shopInStock")}</Badge>
              ) : (
                <Badge variant="secondary">{t("shopOutOfStock")}</Badge>
              )}
              <Badge variant="outline" className="gap-1"><Truck className="w-3 h-3" />{t("shopDelivery")}</Badge>
              {product.seller_type === "master" && (
                <Badge className="bg-primary/10 text-primary border border-primary/20 gap-1"><Award className="w-3 h-3" />{t("shopFromMaster")}</Badge>
              )}
            </div>

            {seller && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      {seller.avatar_url ? (
                        <img src={seller.avatar_url} alt={seller.full_name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <User className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm">{seller.full_name}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-amber-400 text-amber-400" />{seller.average_rating || "—"}</span>
                        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{seller.completed_orders || 0} {t("sellerOrders")}</span>
                      </div>
                    </div>
                    <Link to={`/master-store/${seller.user_id}`}>
                      <Button size="sm" variant="outline" className="rounded-full text-xs">{t("navShop")}</Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {product.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {Object.keys(specs).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{t("shopSpecs")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(specs).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-sm py-1.5 px-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium text-foreground">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {product.installation_price && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <Checkbox checked={withInstall} onCheckedChange={(v) => setWithInstall(!!v)} className="mt-1" />
                    <div>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-primary" /> {t("shopNeedInstall")}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t("shopProfInstall")} — <span className="font-semibold text-primary">{product.installation_price} {t("currencySomoni")}</span>
                      </p>
                    </div>
                  </label>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-foreground">{t("shopQuantity")}:</span>
              <div className="flex items-center border border-border rounded-full overflow-hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQty(Math.max(1, qty - 1))}><Minus className="w-4 h-4" /></Button>
                <span className="w-10 text-center font-medium">{qty}</span>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-none" onClick={() => setQty(qty + 1)}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-xl">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{t("shopProduct")} ({qty} {t("shopPcs")})</span>
                <span>{product.price * qty} с.</span>
              </div>
              {withInstall && product.installation_price && (
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{t("shopMasterInstall")}</span>
                  <span>{product.installation_price} с.</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-border mt-2">
                <span>{t("shopTotal")}</span>
                <span className="text-primary">{totalPrice} {t("currencySomoni")}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button size="lg" className="flex-1 rounded-full gap-2" onClick={() => addToCart(product.id, withInstall)} disabled={!product.in_stock}>
                <ShoppingCart className="w-5 h-5" /> {t("shopAddToCart")}
              </Button>
              <Button size="lg" variant="outline" className="flex-1 rounded-full" onClick={handleBuyNow} disabled={!product.in_stock}>
                {t("shopBuyNow")}
              </Button>
            </div>

            <a href="tel:+992979117007" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <Phone className="w-4 h-4" /> +992 979 117 007
            </a>
          </motion.div>
        </div>

        {/* Frequently Bought Together */}
        {boughtTogether.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">{t("shopBoughtTogether")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("shopBoughtTogetherDesc")}</p>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible">
              {boughtTogether.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={(pid) => addToCart(pid, false)} t={t} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Related Products */}
        {related.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-12">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">{t("shopSimilar")}</h2>
                <p className="text-sm text-muted-foreground mt-1">{t("shopSimilarDesc")}</p>
              </div>
              <Link to={`/shop/category/${product.category_id}`}>
                <Button variant="outline" size="sm" className="rounded-full gap-1">
                  {t("shopAllProducts")} <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide sm:grid sm:grid-cols-2 md:grid-cols-4 sm:overflow-visible">
              {related.map(p => (
                <ProductCard key={p.id} product={p} onAddToCart={(pid) => addToCart(pid, false)} t={t} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Recommended Products */}
        <RecommendedProducts excludeIds={id ? [id] : []} />

        {/* Recently Viewed */}
        <RecentlyViewedProducts excludeId={id} />
      </div>
      <Footer />
    </div>
  );
}
