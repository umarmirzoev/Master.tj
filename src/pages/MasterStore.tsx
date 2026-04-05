import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { motion } from "framer-motion";
import {
  Package, Star, User, ShoppingCart, Briefcase, CheckCircle, MapPin,
} from "lucide-react";
import { SmartProductImage } from "@/components/shop/SmartProductImage";

// Страница магазина мастера показывает его профиль и все опубликованные товары.
export default function MasterStore() {
  const { masterId } = useParams();
  const [master, setMaster] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  // Загружаем профиль мастера и все одобренные товары, которые он продаёт через площадку.
  useEffect(() => {
    const load = async () => {
      if (!masterId) return;
      const [masterRes, prodsRes] = await Promise.all([
        supabase.from("master_listings").select("*").eq("user_id", masterId).single(),
        supabase.from("shop_products").select("*, shop_categories(name)")
          .eq("master_id", masterId).eq("is_approved", true).order("created_at", { ascending: false }),
      ]);
      setMaster(masterRes.data);
      setProducts(prodsRes.data || []);
      setLoading(false);
    };
    load();
  }, [masterId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container px-4 mx-auto py-16">
          <div className="h-64 bg-muted animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-4 mx-auto py-8">
        {/* Верхняя карточка кратко знакомит пользователя с мастером-продавцом. */}
        {master && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="mb-8 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-5">
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    {master.avatar_url ? (
                      <img src={master.avatar_url} alt={master.full_name} className="w-full h-full object-cover rounded-2xl" />
                    ) : (
                      <User className="w-10 h-10 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-bold text-foreground">{master.full_name}</h1>
                      <Badge className="bg-primary/10 text-primary border-primary/20">Мастер-продавец</Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      {master.service_categories?.length > 0 && (
                        <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {master.service_categories.join(", ")}</span>
                      )}
                      <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {master.average_rating || "—"}</span>
                      <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> {master.completed_orders || 0} заказов</span>
                      <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {products.length} товаров</span>
                    </div>
                    {master.bio && <p className="text-sm text-muted-foreground mt-2">{master.bio}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <h2 className="text-xl font-bold text-foreground mb-6">Товары мастера</h2>

        {products.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Мастер пока не добавил товары</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map(p => {
              const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
              return (
                <Card key={p.id} className="group hover:shadow-lg transition-all hover:-translate-y-1 overflow-hidden border-border">
                  <div className="relative aspect-square bg-muted/30 flex items-center justify-center p-4">
                    <SmartProductImage product={p} alt={p.name} className="w-full h-full object-contain" />
                    {discount > 0 && <Badge className="absolute top-2 left-2 bg-red-500 text-white">-{discount}%</Badge>}
                    <Badge className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px]">От мастера</Badge>
                  </div>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground mb-1">{p.shop_categories?.name}</p>
                    <Link to={`/shop/product/${p.id}`}>
                      <h3 className="text-sm font-medium text-foreground line-clamp-2 hover:text-primary mb-2 min-h-[2.5rem]">{p.name}</h3>
                    </Link>
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
      </div>
      <Footer />
    </div>
  );
}
