import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Award, TrendingUp, ArrowRight, Clock, MapPin, Package } from "lucide-react";
import { SmartProductImage } from "@/components/shop/SmartProductImage";

// Эти секции выводят рейтинговые подборки мастеров и товаров для главной страницы.
export function TopMastersWeek() {
  const { t } = useLanguage();
  const [masters, setMasters] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("master_listings")
      .select("id, full_name, average_rating, total_reviews, experience_years, service_categories, working_districts, price_min, completed_orders, is_top_master")
      .eq("is_active", true)
      .order("ranking_score", { ascending: false })
      .limit(6)
      .then(({ data }) => setMasters(data || []));
  }, []);

  if (masters.length === 0) return null;

  const gradients = ["from-primary to-emerald-400", "from-blue-500 to-cyan-400", "from-violet-500 to-purple-400", "from-amber-500 to-orange-400", "from-rose-500 to-pink-400", "from-teal-500 to-green-400"];

  return (
    <section className="py-20 bg-muted/30 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="container px-4 mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Award className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{t("topMastersWeek")}</h2>
            </div>
            <p className="text-muted-foreground">{t("topMastersWeekDesc")}</p>
          </div>
          <Link to="/masters" className="inline-flex items-center text-primary hover:text-primary/80 font-semibold text-sm gap-1 group">
            {t("viewAllMasters")}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {masters.map((m, i) => {
            const initials = m.full_name.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
            const gradient = gradients[i % gradients.length];
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <Link to={`/masters/${m.id}`}>
                  <Card className="group glass-card border-border/40 rounded-2xl overflow-hidden hover:border-primary/20 relative">
                    {i < 3 && (
                      <div className="absolute top-3 right-3 z-10">
                        <Badge className="bg-amber-500 text-white gap-1 text-xs shadow-md rounded-lg">
                          <Award className="w-3 h-3" /> #{i + 1}
                        </Badge>
                      </div>
                    )}
                    <div className={`h-1 bg-gradient-to-r ${gradient}`} />
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3.5 mb-3">
                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-md`}>
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-foreground group-hover:text-primary transition-colors">{m.full_name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-sm">{m.average_rating}</span>
                            <span className="text-xs text-muted-foreground">({m.total_reviews})</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {m.experience_years} {t("yearsShort")}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {m.working_districts?.[0]}</span>
                        <span className="ml-auto font-semibold text-foreground">{t("fromPrice")} {m.price_min} сом.</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TopProducts() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("shop_products")
      .select("id, name, price, old_price, image_url, rating, reviews_count, is_popular")
      .eq("in_stock", true)
      .order("rating", { ascending: false })
      .limit(4)
      .then(({ data }) => setProducts(data || []));
  }, []);

  if (products.length === 0) return null;

  return (
    <section className="py-20 bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      <div className="container px-4 mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{t("topProducts")}</h2>
            </div>
            <p className="text-muted-foreground">{t("topProductsDesc")}</p>
          </div>
          <Link to="/shop" className="inline-flex items-center text-primary hover:text-primary/80 font-semibold text-sm gap-1 group">
            {t("navShop")}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p, i) => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Link to={`/shop/product/${p.id}`}>
                <Card className="group glass-card border-border/40 rounded-2xl overflow-hidden hover:border-primary/20">
                  <div className="aspect-square bg-muted overflow-hidden rounded-t-2xl">
                    <SmartProductImage product={p} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">{p.name}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs font-medium">{p.rating}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-bold text-foreground">{p.price} сом.</span>
                      {p.old_price && <span className="text-xs line-through text-muted-foreground">{p.old_price}</span>}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
