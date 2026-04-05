import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wrench, ArrowRight } from "lucide-react";

interface ServiceCategory {
  id: string;
  name_ru: string;
  name_tj: string;
  name_en: string;
  icon: string;
  color: string;
  sort_order: number;
}

// Страница показывает все категории услуг и количество услуг внутри каждой категории.
const Categories = () => {
  const { language, t } = useLanguage();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Загружаем категории и отдельно считаем количество услуг в каждой категории.
  useEffect(() => {
    Promise.all([
      supabase.from("service_categories").select("*").order("sort_order"),
      supabase.from("services").select("category_id"),
    ]).then(([catsRes, svcsRes]) => {
      setCategories((catsRes.data as ServiceCategory[]) || []);
      const counts: Record<string, number> = {};
      (svcsRes.data || []).forEach((s: any) => {
        counts[s.category_id] = (counts[s.category_id] || 0) + 1;
      });
      setServiceCounts(counts);
      setLoading(false);
    });
  }, []);

  const getName = (item: { name_ru: string; name_tj: string; name_en: string }) => {
    if (language === "tj") return item.name_tj || item.name_ru;
    if (language === "en") return item.name_en || item.name_ru;
    return item.name_ru;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      {/* На этой странице пользователь выбирает нужное направление работ перед переходом к услугам. */}
      <section className="py-12 md:py-20">
        <div className="container px-4 mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">{t("categoriesTitle")}</h1>
            <p className="text-muted-foreground text-lg">{t("categoriesDescription")}</p>
          </motion.div>

          {/* В зависимости от состояния показываем скелетоны загрузки или готовую сетку категорий. */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-40 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {categories.map((cat, index) => (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.4) }}
                >
                  <Link to={`/category/${cat.id}`}>
                    <Card className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden h-full">
                      <div className={`h-1.5 bg-gradient-to-r ${cat.color}`} />
                      <CardContent className="p-4 sm:p-5 text-center">
                        <div className={`w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                          <Wrench className="w-7 h-7 text-white" />
                        </div>
                        <h3 className="font-bold text-foreground text-sm sm:text-base mb-1 group-hover:text-primary transition-colors">
                          {getName(cat)}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {serviceCounts[cat.id] || 0} {language === "en" ? "services" : "услуг"}
                        </Badge>
                        <div className="flex items-center justify-center gap-1 mt-3 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Открыть <ArrowRight className="w-3 h-3" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
};

export default Categories;
