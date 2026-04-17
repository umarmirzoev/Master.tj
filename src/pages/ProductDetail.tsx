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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/hooks/useCart";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import RecommendedProducts from "@/components/shop/RecommendedProducts";
import CountdownTimer from "@/components/shop/CountdownTimer";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { FavoriteButton } from "@/components/favorites/FavoritesSection";
import { useProductComparison } from "@/hooks/useProductComparison";
import { getProductGallery } from "@/utils/shopImages";
import { detectProductBrand } from "@/utils/shopCatalog";
import {
  fallbackShopProducts,
  getFallbackProductById,
  getFallbackProductsByCategoryId,
  isFallbackProductId,
} from "@/data/shopFallback";
import { motion } from "framer-motion";
import {
  ShoppingCart, Star, Package, Phone, Minus, Plus,
  CheckCircle, Wrench, Truck, User, Award, ArrowRight, MessageCircle, Heart, Scale, Building2,
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
  const canAddToCart = true;
  const stockCount = product.stock_qty ?? product.stock_quantity ?? product.quantity ?? (product.in_stock ? Math.max(3, ((product.reviews_count || 0) % 9) + 2) : 0);
  const quickLink = `https://wa.me/992979117007?text=${encodeURIComponent(`Здравствуйте! Интересует товар: ${product.name}`)}`;
  return (
    <Card className="hover:shadow-lg transition-all overflow-hidden border-border group shrink-0 w-[180px] sm:w-auto">
      <Link to={`/shop/product/${product.id}`}>
        <div className="aspect-square bg-muted/20 flex items-center justify-center overflow-hidden relative">
          <SmartProductImage product={product} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton itemType="product" itemId={product.id} size="sm" />
          </div>
          {product.promotion_label && (
            <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground text-[10px]">{product.promotion_label}</Badge>
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
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className={`font-medium ${product.in_stock ? "text-emerald-600" : "text-muted-foreground"}`}>
            {product.in_stock ? `В наличии: ${stockCount} шт.` : t("shopOutOfStock")}
          </span>
          {product.installation_price && <span className="text-primary font-medium">Установка</span>}
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 rounded-full text-xs h-8 gap-1" disabled={!canAddToCart} onClick={(e) => { e.preventDefault(); onAddToCart(product.id); }}>
            <ShoppingCart className="w-3 h-3" /> {t("shopAddToCart")}
          </Button>
          <a href={quickLink} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-2.5">
              <MessageCircle className="w-3 h-3" />
            </Button>
          </a>
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
  const [quickBuyOpen, setQuickBuyOpen] = useState(false);
  const [quickBuyForm, setQuickBuyForm] = useState({ name: "", phone: "", comment: "" });
  const [productReviews, setProductReviews] = useState<any[]>([]);
  const [reviewProfiles, setReviewProfiles] = useState<Record<string, any>>({});
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const { addToCart } = useCart();
  const { toggleCompare, isComparing, compareIds, maxCompareItems } = useProductComparison();
  const { addProduct: addToRecentlyViewed } = useRecentlyViewed();
  const { profile, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Загружаем товар, продавца, похожие товары и кросс-селл-подборку.
    const load = async () => {
      setLoading(true);
      const fallbackProduct = getFallbackProductById(id);
      if (fallbackProduct) {
        setProduct(fallbackProduct);
        setActiveImage(0);
        setSeller(null);
        setRelated(
          getFallbackProductsByCategoryId(fallbackProduct.category_id)
            .filter((item) => item.id !== fallbackProduct.id)
            .slice(0, 8)
        );
        setBoughtTogether(
          fallbackShopProducts
            .filter((item) => item.category_id !== fallbackProduct.category_id && (item.is_popular || item.is_discounted))
            .slice(0, 8)
        );
        setLoading(false);
        addToRecentlyViewed({
          id: fallbackProduct.id,
          name: fallbackProduct.name,
          image_url: fallbackProduct.image_url,
          price: fallbackProduct.price,
          old_price: fallbackProduct.old_price,
          rating: fallbackProduct.rating,
        });
        return;
      }

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

  useEffect(() => {
    const loadReviews = async () => {
      if (!id || isFallbackProductId(id)) {
        setProductReviews([]);
        setReviewProfiles({});
        return;
      }

      const { data, error } = await supabase
        .from("shop_product_reviews" as any)
        .select("*")
        .eq("product_id", id)
        .eq("is_approved", true)
        .order("created_at", { ascending: false });

      if (error) {
        setProductReviews([]);
        setReviewProfiles({});
        return;
      }

      const reviews = (data as any[]) || [];
      setProductReviews(reviews);

      const userIds = [...new Set(reviews.map((review) => review.user_id).filter(Boolean))];
      if (userIds.length === 0) {
        setReviewProfiles({});
        return;
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileMap: Record<string, any> = {};
      (profilesData || []).forEach((item) => {
        profileMap[item.user_id] = item;
      });
      setReviewProfiles(profileMap);
    };

    void loadReviews();
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

  const galleryImages = getProductGallery(product);

  const discount = product.old_price ? Math.round((1 - product.price / product.old_price) * 100) : 0;
  const totalPrice = product.price * qty + (withInstall && product.installation_price ? product.installation_price : 0);
  const specs = typeof product.specs === "object" && product.specs !== null ? product.specs : {};
  const sourceText = `${product.name || ""} ${product.description || ""}`;
  const detectValue = (pattern: RegExp) => {
    const match = sourceText.match(pattern);
    return match?.[0] || "";
  };
  const materialMatch = detectValue(/латунь|сталь|алюминий|пластик|пвх|медь|керамика/i);
  const powerMatch = detectValue(/\d+\s?(вт|w|мп|btu|а|a)/i);
  const sizeMatch = detectValue(/\d+\s?(мм|см|м|дюйм|")/i);
  const brandMatch = detectProductBrand(product);
  const stockCount = product.stock_qty ?? product.stock_quantity ?? product.quantity ?? (product.in_stock ? Math.max(3, ((product.reviews_count || 0) % 9) + 2) : 0);
  const compareActive = isComparing(product.id);
  const compareDisabled = !compareActive && compareIds.length >= maxCompareItems;
  const fallbackSpecs: Record<string, string> = {};

  if (product.brand || brandMatch) fallbackSpecs["Бренд"] = product.brand || brandMatch;
  if (product.shop_categories?.name) fallbackSpecs[t("shopCategory")] = product.shop_categories.name;
  if (powerMatch) fallbackSpecs["Мощность"] = powerMatch;
  if (sizeMatch) fallbackSpecs["Размер"] = sizeMatch;
  if (materialMatch) fallbackSpecs["Материал"] = materialMatch;
  if (stockCount) fallbackSpecs["В наличии"] = `${stockCount} шт.`;
  if (product.installation_price) fallbackSpecs[t("shopMasterInstall")] = `${product.installation_price} ${t("currencySomoni")}`;
  if (product.old_price) fallbackSpecs[t("shopOldPrice")] = `${product.old_price} ${t("currencySomoni")}`;
  if (product.rating) fallbackSpecs[t("shopRating")] = `${product.rating} / 5`;
  if (product.reviews_count) fallbackSpecs[t("shopReviews")] = String(product.reviews_count);
  if (product.seller_type) fallbackSpecs[t("productFromMaster")] = product.seller_type === "master" ? t("yes") : t("no");

  const displaySpecs = Object.keys(specs).length > 0 ? specs : fallbackSpecs;
  const reviewCount = productReviews.length > 0 ? productReviews.length : Number(product.reviews_count) || 0;
  const avgRating = productReviews.length > 0
    ? productReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / productReviews.length
    : Number(product.rating) || 0;
  const ratingDistribution = [5, 4, 3, 2, 1].map((score) => {
    if (reviewCount === 0) return { score, count: 0, percentage: 0 };
    const distance = Math.abs(score - avgRating);
    const weight = Math.max(1, 6 - Math.round(distance * 3));
    const raw = Math.round((reviewCount * weight) / 15);
    return { score, count: raw, percentage: 0 };
  });
  const normalizedTotal = ratingDistribution.reduce((sum, item) => sum + item.count, 0) || 1;
  const reviewBars = ratingDistribution.map((item, index) => {
    let count = item.count;
    if (index === ratingDistribution.length - 1) {
      count = Math.max(0, reviewCount - ratingDistribution.slice(0, -1).reduce((sum, row) => sum + row.count, 0));
    }
    return {
      score: item.score,
      count,
      percentage: reviewCount > 0 ? Math.max(4, Math.round((count / normalizedTotal) * 100)) : 0,
    };
  });
  const productHighlights = [
    {
      icon: CheckCircle,
      title: product.in_stock ? t("shopInStock") : t("shopOutOfStock"),
      text: product.in_stock ? `${t("shopTrustDeliveryDesc")}.` : t("shopNoResultsHint"),
    },
    {
      icon: Truck,
      title: t("shopDelivery"),
      text: t("shopTrustDeliveryDesc"),
    },
    {
      icon: Wrench,
      title: product.installation_price ? t("shopMasterInstall") : t("shopNeedHelp"),
      text: product.installation_price
        ? `${t("shopInstallFrom")} ${product.installation_price} ${t("currencySomoni")}`
        : t("shopFindMaster"),
    },
  ];

  // Быстрая покупка кладёт товар в корзину и переводит пользователя к оформлению.
  const handleBuyNow = async () => {
    if (isFallbackProductId(product.id)) return;
    await addToCart(product.id, withInstall);
    window.location.href = "/cart";
  };

  const handleQuickBuyOpen = () => {
    setQuickBuyForm({
      name: profile?.full_name || "",
      phone: profile?.phone || "",
      comment: `Хочу купить в 1 клик: ${product.name}${withInstall && product.installation_price ? " + установка" : ""}`,
    });
    setQuickBuyOpen(true);
  };

  const quickBuyWhatsAppLink = `https://wa.me/992979117007?text=${encodeURIComponent(
    `Купить в 1 клик\nТовар: ${product.name}\nКоличество: ${qty}\nУстановка: ${withInstall && product.installation_price ? "Да" : "Нет"}\nИмя: ${quickBuyForm.name || "—"}\nТелефон: ${quickBuyForm.phone || "—"}\nКомментарий: ${quickBuyForm.comment || "—"}`
  )}`;

  const handleSubmitReview = async () => {
    if (!user) {
      toast({ title: "Нужно войти в аккаунт", variant: "destructive" });
      return;
    }
    if (reviewForm.rating === 0) {
      toast({ title: "Поставьте оценку товару", variant: "destructive" });
      return;
    }
    // Demo mode restriction removed: we now allow adding fallback items to cart.

    setSubmittingReview(true);
    const payload = {
      product_id: product.id,
      user_id: user.id,
      rating: reviewForm.rating,
      comment: reviewForm.comment.trim() || null,
    };

    const table = "shop_product_reviews" as any;
    const existingReview = productReviews.find((review) => review.user_id === user.id);
    const request = existingReview
      ? supabase.from(table).update(payload).eq("id", existingReview.id)
      : supabase.from(table).insert(payload);

    const { error } = await request;
    if (error) {
      toast({ title: "Не удалось сохранить отзыв", description: error.message, variant: "destructive" });
      setSubmittingReview(false);
      return;
    }

    const { data: freshReviews } = await supabase
      .from(table)
      .select("*")
      .eq("product_id", product.id)
      .eq("is_approved", true)
      .order("created_at", { ascending: false });

    setProductReviews((freshReviews as any[]) || []);
    if (user.id) {
      setReviewProfiles((prev) => ({
        ...prev,
        [user.id]: { user_id: user.id, full_name: profile?.full_name || "Вы", avatar_url: profile?.avatar_url || null },
      }));
    }
    setReviewForm({ rating: 0, comment: "" });
    toast({ title: existingReview ? "Отзыв обновлен" : "Отзыв добавлен" });
    setSubmittingReview(false);
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
                <SmartProductImage
                  product={{ ...product, image_url: galleryImages[activeImage] || galleryImages[0], images: galleryImages }}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-300"
                />
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
                    <SmartProductImage
                      product={{ ...product, image_url: img, images: [img] }}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    </button>
                  ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
            <div>
              <p className="text-sm text-primary font-medium mb-1">{product.shop_categories?.name}</p>
              <div className="flex items-start justify-between gap-4">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{product.name}</h1>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className={`rounded-full ${compareActive ? "border-primary text-primary" : ""}`}
                    onClick={() => toggleCompare(product.id)}
                    disabled={compareDisabled}
                  >
                    <Scale className="w-4 h-4" />
                  </Button>
                  <FavoriteButton itemType="product" itemId={product.id} size="default" />
                </div>
              </div>
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
              {product.installation_price && (
                <Badge className="bg-primary text-primary-foreground gap-1"><Wrench className="w-3 h-3" />Можно с установкой мастером</Badge>
              )}
              {product.promotion_label && (
                <Badge variant="outline">{product.promotion_label}</Badge>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground mb-1">Остаток</p>
                <p className="text-lg font-bold text-foreground">{stockCount} шт.</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground mb-1">Артикул</p>
                <p className="text-lg font-bold text-foreground">{String(product.id).slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground mb-1">Продажа</p>
                <p className="text-lg font-bold text-foreground">{product.seller_type === "master" ? "Мастер" : "Магазин"}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Link to="/shop/brands" className="rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-primary/10 p-2"><Building2 className="w-4 h-4 text-primary" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Бренд</p>
                    <p className="font-semibold text-foreground">{brandMatch || "Не указан"}</p>
                  </div>
                </div>
              </Link>
              <Link to="/shop/promotions" className="rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-destructive/10 p-2"><Heart className="w-4 h-4 text-destructive" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Акции</p>
                    <p className="font-semibold text-foreground">{product.promotion_label || "Смотреть скидки"}</p>
                  </div>
                </div>
              </Link>
              <Link to="/shop/compare" className="rounded-2xl border border-border bg-background p-4 transition-colors hover:border-primary/40">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500/10 p-2"><Scale className="w-4 h-4 text-amber-600" /></div>
                  <div>
                    <p className="text-xs text-muted-foreground">Сравнение</p>
                    <p className="font-semibold text-foreground">{compareActive ? "Добавлен" : `${compareIds.length}/4 выбрано`}</p>
                  </div>
                </div>
              </Link>
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

            {Object.keys(displaySpecs).length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">{t("shopSpecs")}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(displaySpecs).map(([key, val]) => (
                    <div key={key} className="flex justify-between text-sm py-1.5 px-3 bg-muted/50 rounded-lg">
                      <span className="text-muted-foreground">{key}</span>
                      <span className="font-medium text-foreground">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              {productHighlights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-background p-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <item.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

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
              <Button
                size="lg"
                className="flex-1 rounded-full gap-2"
                onClick={() => addToCart(product.id, withInstall)}
                disabled={!product.in_stock}
              >
                <ShoppingCart className="w-5 h-5" /> {t("shopAddToCart")}
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1 rounded-full"
                onClick={handleBuyNow}
                disabled={!product.in_stock}
              >
                {t("shopBuyNow")}
              </Button>
            </div>

            <Button
              size="lg"
              variant="secondary"
              className="w-full rounded-full gap-2"
              onClick={handleQuickBuyOpen}
            >
              <Heart className="w-5 h-5" /> Купить в 1 клик
            </Button>

            <div className="grid gap-3 sm:grid-cols-2">
              <a href="tel:+992979117007" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary rounded-2xl border border-border px-4 py-3">
                <Phone className="w-4 h-4" /> +992 979 117 007
              </a>
              <a
                href={`https://wa.me/992979117007?text=${encodeURIComponent(`Здравствуйте! Хочу уточнить по товару: ${product.name}`)}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary rounded-2xl border border-border px-4 py-3"
              >
                <MessageCircle className="w-4 h-4" /> WhatsApp
              </a>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mt-12">
          <Card className="border-border">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                <div className="lg:w-72 shrink-0">
                  <p className="text-sm font-semibold text-foreground mb-2">Отзывы и рейтинг</p>
                  <div className="flex items-end gap-3">
                    <span className="text-4xl font-bold text-foreground">{avgRating.toFixed(1)}</span>
                    <div className="pb-1">
                      <div className="flex items-center gap-0.5 mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{reviewCount} {t("shopReviews")}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    {reviewCount > 0 ? "Рейтинг собран по текущим оценкам товара." : "Пока нет оценок. Отзывы появятся после первых заказов."}
                  </p>
                </div>

                <div className="flex-1 space-y-3">
                  {reviewBars.map((item) => (
                    <div key={item.score} className="flex items-center gap-3">
                      <span className="w-6 text-sm font-medium text-foreground">{item.score}</span>
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${item.percentage}%` }} />
                      </div>
                      <span className="w-10 text-xs text-right text-muted-foreground">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-foreground">Оставить отзыв</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((score) => (
                      <button
                        key={score}
                        type="button"
                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: score }))}
                        className="transition-transform hover:scale-110"
                      >
                        <Star className={`w-7 h-7 ${score <= reviewForm.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea
                    rows={4}
                    placeholder={user ? "Что понравилось в товаре и установке?" : "Войдите, чтобы оставить отзыв"}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                    disabled={!user}
                  />
                  <Button onClick={handleSubmitReview} disabled={!user || submittingReview} className="rounded-full">
                    {submittingReview ? "Сохраняем..." : "Отправить отзыв"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-foreground">Отзывы покупателей</p>
                  {productReviews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-5 text-sm text-muted-foreground">
                      Пока нет текстовых отзывов. Первый покупатель может оставить мнение о товаре здесь.
                    </div>
                  ) : (
                    productReviews.slice(0, 6).map((review) => {
                      const author = reviewProfiles[review.user_id];
                      const authorName = author?.full_name || "Покупатель";
                      return (
                        <div key={review.id} className="rounded-2xl border border-border p-4 bg-background">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold overflow-hidden">
                                {author?.avatar_url ? (
                                  <img src={author.avatar_url} alt={authorName} className="w-full h-full object-cover" />
                                ) : (
                                  <span>{authorName.slice(0, 1).toUpperCase()}</span>
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-sm">{authorName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(review.created_at).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map((score) => (
                                <Star key={score} className={`w-3.5 h-3.5 ${score <= review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                              ))}
                            </div>
                          </div>
                          {review.comment ? (
                            <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                          ) : (
                            <p className="text-sm text-muted-foreground">Пользователь поставил оценку без текстового комментария.</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

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

      </div>
      <div className="md:hidden fixed bottom-3 left-3 right-3 z-40">
        <div className="rounded-3xl border border-border bg-background/95 backdrop-blur p-3 shadow-2xl">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <p className="text-xs text-muted-foreground">{product.name}</p>
              <p className="text-lg font-bold text-foreground">{totalPrice} {t("currencySomoni")}</p>
            </div>
            <FavoriteButton itemType="product" itemId={product.id} size="default" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button className="rounded-full" onClick={() => addToCart(product.id, withInstall)} disabled={!product.in_stock}>
              {t("shopAddToCart")}
            </Button>
            <Button variant="outline" className="rounded-full" onClick={handleQuickBuyOpen}>
              Купить в 1 клик
            </Button>
          </div>
        </div>
      </div>
      <Dialog open={quickBuyOpen} onOpenChange={setQuickBuyOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Купить в 1 клик</DialogTitle>
            <DialogDescription>
              Отправьте заявку в WhatsApp, и мы быстро свяжемся по товару {product.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl bg-muted/40 p-4 text-sm">
              <p className="font-semibold text-foreground">{product.name}</p>
              <p className="text-muted-foreground mt-1">
                {qty} шт. • {product.price} {t("currencySomoni")} {withInstall && product.installation_price ? `• + установка ${product.installation_price} ${t("currencySomoni")}` : ""}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Имя</label>
              <Input value={quickBuyForm.name} onChange={(e) => setQuickBuyForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Телефон</label>
              <Input value={quickBuyForm.phone} onChange={(e) => setQuickBuyForm((prev) => ({ ...prev, phone: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5">Комментарий</label>
              <Textarea rows={3} value={quickBuyForm.comment} onChange={(e) => setQuickBuyForm((prev) => ({ ...prev, comment: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="rounded-full" onClick={() => setQuickBuyOpen(false)}>
                {t("cancel")}
              </Button>
              <a href={quickBuyWhatsAppLink} target="_blank" rel="noreferrer">
                <Button className="w-full rounded-full">
                  WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Footer />
    </div>
  );
}
