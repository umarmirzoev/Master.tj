import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SmartProductImage } from "@/components/shop/SmartProductImage";
import { ArrowLeft, Loader2, MessageSquare, Star } from "lucide-react";

export default function ShopReviews() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [products, setProducts] = useState<Record<string, any>>({});

  useEffect(() => {
    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data } = await supabase
        .from("shop_product_reviews" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      const loadedReviews = (data as any[]) || [];
      setReviews(loadedReviews);

      const productIds = [...new Set(loadedReviews.map((review) => review.product_id).filter(Boolean))];
      if (productIds.length > 0) {
        const { data: productsData } = await supabase
          .from("shop_products")
          .select("id, name, image_url, images, price")
          .in("id", productIds);

        setProducts(Object.fromEntries(((productsData || []) as any[]).map((product) => [product.id, product])));
      } else {
        setProducts({});
      }

      setLoading(false);
    };

    void load();
  }, [user]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return "0.0";
    return (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" />
              В магазин
            </Link>
            <div>
              <p className="text-sm text-muted-foreground">Магазин / Мои отзывы</p>
              <h1 className="text-3xl font-bold text-foreground">Мои отзывы о товарах</h1>
              <p className="mt-2 text-muted-foreground">Здесь собраны все отзывы, которые вы оставили о товарах магазина.</p>
            </div>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/shop/orders">К моим заказам</Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-16 text-center">
              <MessageSquare className="mx-auto mb-4 h-16 w-16 text-primary/40" />
              <h2 className="mb-2 text-2xl font-bold text-foreground">Нужно войти в аккаунт</h2>
              <p className="mb-6 text-muted-foreground">После входа здесь появятся ваши отзывы по товарам.</p>
              <Button asChild className="rounded-full">
                <Link to="/auth">Войти</Link>
              </Button>
            </CardContent>
          </Card>
        ) : reviews.length === 0 ? (
          <Card className="border-dashed border-primary/30 bg-primary/5">
            <CardContent className="py-16 text-center">
              <MessageSquare className="mx-auto mb-4 h-16 w-16 text-primary/40" />
              <h2 className="mb-2 text-2xl font-bold text-foreground">У вас пока нет отзывов</h2>
              <p className="mb-6 text-muted-foreground">Откройте товар из заказа и оставьте отзыв, чтобы он появился здесь.</p>
              <Button asChild className="rounded-full">
                <Link to="/shop/orders">Перейти к заказам</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex flex-wrap items-center gap-6 p-5">
                <div>
                  <p className="text-sm text-muted-foreground">Всего отзывов</p>
                  <p className="text-3xl font-bold text-foreground">{reviews.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Средняя оценка</p>
                  <p className="text-3xl font-bold text-primary">{averageRating}</p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              {reviews.map((review) => {
                const product = products[review.product_id];

                return (
                  <Card key={review.id} className="border-border">
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="h-20 w-20 overflow-hidden rounded-2xl bg-muted/30">
                          {product ? (
                            <SmartProductImage product={product} alt={product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <MessageSquare className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <Link to={`/shop/product/${review.product_id}`} className="font-semibold text-foreground hover:text-primary">
                            {product?.name || "Товар"}
                          </Link>
                          <p className="mt-1 text-sm text-muted-foreground">{new Date(review.created_at).toLocaleDateString("ru-RU")}</p>
                          {product?.price && <p className="mt-1 text-sm font-medium text-foreground">{product.price} сомони</p>}
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                            {Array.from({ length: Number(review.rating || 0) }).map((_, index) => (
                              <Star key={index} className="h-3 w-3 fill-current" />
                            ))}
                          </Badge>
                          <Badge variant={review.is_approved ? "default" : "secondary"}>
                            {review.is_approved ? "Опубликован" : "На модерации"}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm leading-relaxed text-foreground">{review.comment || "Без текста отзыва"}</p>

                      <div className="flex gap-2">
                        <Button asChild variant="outline" className="rounded-full">
                          <Link to={`/shop/product/${review.product_id}`}>Открыть товар</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
