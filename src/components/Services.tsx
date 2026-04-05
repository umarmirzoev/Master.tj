import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import {
  Zap, Droplets, Paintbrush, Sofa, Hammer, Camera, Flame, Wrench, Home, Cpu, MoreHorizontal, ArrowRight, Wind,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  "Электрика": Zap, "Сантехника": Droplets, "Отделка": Paintbrush,
  "Мебель и двери": Sofa, "Умный дом": Cpu, "Видеонаблюдение": Camera,
  "Сад и двор": Hammer, "Сварочные работы": Flame, "Подвалы и гаражи": Hammer,
  "Уборка": Paintbrush, "Ремонт под ключ": Home, "Аварийные 24/7": Wrench,
  "Ремонт техники": Wrench, "Кондиционеры": Wind, "Отопление": Flame,
  "Окна и двери": Home, "Малярные работы": Paintbrush, "Потолки": Home,
  "Полы и ламинат": Hammer, "Срочный мастер 24/7": Wrench,
  "Бытовая техника": Cpu, "Другие услуги": MoreHorizontal,
};

const colorMap: Record<string, string> = {
  "Электрика": "from-amber-400 to-yellow-500",
  "Сантехника": "from-sky-400 to-blue-500",
  "Отделка": "from-green-400 to-emerald-500",
  "Мебель и двери": "from-orange-400 to-amber-500",
  "Умный дом": "from-violet-400 to-purple-500",
  "Видеонаблюдение": "from-indigo-400 to-blue-500",
  "Сад и двор": "from-lime-400 to-green-500",
  "Сварочные работы": "from-red-400 to-orange-500",
  "Подвалы и гаражи": "from-slate-400 to-gray-500",
  "Уборка": "from-teal-400 to-cyan-500",
  "Ремонт под ключ": "from-pink-400 to-rose-500",
  "Аварийные 24/7": "from-rose-500 to-red-600",
  "Ремонт техники": "from-cyan-400 to-blue-500",
  "Кондиционеры": "from-cyan-400 to-blue-500",
  "Отопление": "from-orange-400 to-red-500",
  "Окна и двери": "from-amber-400 to-orange-500",
  "Малярные работы": "from-fuchsia-400 to-pink-500",
  "Потолки": "from-indigo-400 to-violet-500",
  "Полы и ламинат": "from-stone-400 to-amber-500",
  "Срочный мастер 24/7": "from-red-500 to-rose-600",
  "Бытовая техника": "from-blue-400 to-indigo-500",
  "Другие услуги": "from-gray-400 to-slate-500",
};

interface Category {
  id: string;
  name_ru: string;
  name_tj: string;
  name_en: string;
}

// Компонент выводит витрину категорий услуг для главной страницы и других разделов.
export const Services = () => {
  const { language, t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [serviceCounts, setServiceCounts] = useState<Record<string, number>>({});

  // Загружаем категории и отдельно считаем число услуг внутри каждой из них.
  useEffect(() => {
    Promise.all([
      supabase.from("service_categories").select("id, name_ru, name_tj, name_en").order("sort_order"),
      supabase.from("services").select("category_id"),
    ]).then(([catsRes, svcsRes]) => {
      setCategories((catsRes.data as Category[]) || []);
      const counts: Record<string, number> = {};
      (svcsRes.data || []).forEach((s: any) => {
        counts[s.category_id] = (counts[s.category_id] || 0) + 1;
      });
      setServiceCounts(counts);
    });
  }, []);

  const getName = (cat: Category) => {
    if (language === "tj") return cat.name_tj || cat.name_ru;
    if (language === "en") return cat.name_en || cat.name_ru;
    return cat.name_ru;
  };

  return (
    <div className="container px-4 mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {categories.map((cat, i) => {
          const Icon = iconMap[cat.name_ru] || MoreHorizontal;
          const color = colorMap[cat.name_ru] || "from-gray-400 to-slate-500";
          const count = serviceCounts[cat.id] || 0;

          return (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
            >
              <Link to={`/category/${cat.id}`}>
                <Card className="group cursor-pointer glass-card border-border/40 rounded-2xl h-full hover:border-primary/20">
                  <CardContent className="p-4 sm:p-5">
                    <div className={`w-12 h-12 sm:w-13 sm:h-13 mb-3 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-1.5 group-hover:text-primary transition-colors">{getName(cat)}</h3>
                    <p className="text-xs text-muted-foreground mb-3">
                      {count} {language === "en" ? "services" : "услуг"}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      {t("categoryChooseServices")}
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
