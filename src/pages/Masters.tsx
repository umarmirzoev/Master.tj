import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search, Star, MapPin, Clock, Phone, MessageCircle,
  SlidersHorizontal, X, ChevronDown, Users, Award, Shield, Scale,
} from "lucide-react";
import MasterComparisonDialog, { CompareBar, useComparison } from "@/components/MasterComparison";

interface MasterListing {
  id: string;
  full_name: string;
  phone: string;
  avatar_url: string;
  bio: string;
  service_categories: string[];
  working_districts: string[];
  experience_years: number;
  average_rating: number;
  total_reviews: number;
  price_min: number;
  price_max: number;
  latitude: number | null;
  longitude: number | null;
  ranking_score: number;
  is_top_master: boolean;
  quality_flag: string;
  completed_orders: number;
}

const ALL_CATEGORIES = [
  "Электрика", "Сантехника", "Отделка", "Мебель и двери", "Умный дом",
  "Видеонаблюдение", "Сад и двор", "Сварочные работы", "Подвалы и гаражи",
  "Уборка", "Ремонт под ключ", "Аварийные 24/7", "Ремонт техники",
];

const ALL_DISTRICTS = ["Сино", "Фирдавси", "Шохмансур", "Исмоили Сомони", "Пригород"];

// Страница каталога мастеров позволяет искать, фильтровать, сортировать и сравнивать специалистов.
export default function Masters() {
  const { t } = useLanguage();
  const [masters, setMasters] = useState<MasterListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [district, setDistrict] = useState("all");
  const [sortBy, setSortBy] = useState("ranking");
  const [minRating, setMinRating] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const { compareIds, toggleCompare, clearCompare, isComparing } = useComparison();
  const [compareOpen, setCompareOpen] = useState(false);

  // Загружаем активных мастеров из базы, чтобы дальше применять локальные фильтры и сортировку.
  useEffect(() => {
    supabase
      .from("master_listings")
      .select("*")
      .eq("is_active", true)
      .then(({ data }) => {
        setMasters((data as unknown as MasterListing[]) || []);
        setLoading(false);
      });
  }, []);

  // Здесь собирается итоговый список мастеров с учётом поиска, фильтров и выбранной сортировки.
  const filtered = useMemo(() => {
    let result = masters;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.full_name.toLowerCase().includes(q) ||
          m.service_categories.some((c) => c.toLowerCase().includes(q))
      );
    }

    if (category !== "all") {
      result = result.filter((m) => m.service_categories.includes(category));
    }

    if (district !== "all") {
      result = result.filter((m) => m.working_districts.includes(district));
    }

    if (minRating > 0) {
      result = result.filter((m) => m.average_rating >= minRating);
    }

    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "ranking": return (b.ranking_score || 0) - (a.ranking_score || 0);
        case "rating": return b.average_rating - a.average_rating;
        case "price_low": return a.price_min - b.price_min;
        case "price_high": return b.price_max - a.price_max;
        case "experience": return b.experience_years - a.experience_years;
        case "reviews": return b.total_reviews - a.total_reviews;
        default: return 0;
      }
    });

    return result;
  }, [masters, search, category, district, sortBy, minRating]);

  const activeFilters = [category !== "all", district !== "all", minRating > 0].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-8 md:py-12">
        <div className="container px-4 mx-auto max-w-6xl">
          {/* Заголовок страницы показывает объём каталога и даёт контекст пользователю. */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Наши мастера</h1>
            <p className="text-muted-foreground">
              {masters.length} проверенных специалистов в Душанбе
            </p>
          </motion.div>

          {/* Панель поиска и кнопка фильтров помогают быстро сузить каталог. */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск мастера или услуги..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              className="h-12 gap-2 rounded-xl shrink-0"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Фильтры</span>
              {activeFilters > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
                  {activeFilters}
                </Badge>
              )}
            </Button>
          </div>

          {/* Раскрывающаяся панель содержит основные фильтры по категории, району, рейтингу и сортировке. */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-2xl border border-border bg-card"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Категория</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {ALL_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Район</label>
                  <Select value={district} onValueChange={setDistrict}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все районы</SelectItem>
                      {ALL_DISTRICTS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Сортировка</label>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ranking">По рекомендации</SelectItem>
                      <SelectItem value="rating">По рейтингу</SelectItem>
                      <SelectItem value="price_low">Цена: по возрастанию</SelectItem>
                      <SelectItem value="price_high">Цена: по убыванию</SelectItem>
                      <SelectItem value="experience">По опыту</SelectItem>
                      <SelectItem value="reviews">По отзывам</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">
                    Мин. рейтинг: {minRating > 0 ? minRating.toFixed(1) : "Любой"}
                  </label>
                  <Slider
                    value={[minRating]}
                    onValueChange={([v]) => setMinRating(v)}
                    max={5}
                    step={0.5}
                    className="mt-3"
                  />
                </div>
              </div>
              {activeFilters > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-muted-foreground"
                  onClick={() => { setCategory("all"); setDistrict("all"); setMinRating(0); }}
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Сбросить фильтры
                </Button>
              )}
            </motion.div>
          )}

          {/* Этот блок показывает, сколько мастеров осталось после текущих фильтров. */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4" />
              Найдено: {filtered.length} мастеров
            </p>
          </div>

          {/* Основная часть страницы: скелетон, пустое состояние или сетка карточек мастеров. */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground">Мастера не найдены</p>
              <p className="text-muted-foreground">Попробуйте изменить фильтры</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((master, index) => (
                <MasterCard key={master.id} master={master} index={index} isComparing={isComparing(master.id)} onToggleCompare={() => toggleCompare(master.id)} compareDisabled={compareIds.length >= 3 && !isComparing(master.id)} />
              ))}
            </div>
          )}
        </div>
      </section>
      <CompareBar compareIds={compareIds} onOpen={() => setCompareOpen(true)} onClear={clearCompare} />
      <MasterComparisonDialog open={compareOpen} onOpenChange={setCompareOpen} masterIds={compareIds} />
      <Footer />
    </div>
  );
}

function MasterCard({ master, index, isComparing, onToggleCompare, compareDisabled }: { master: MasterListing; index: number; isComparing: boolean; onToggleCompare: () => void; compareDisabled: boolean }) {
  const initials = master.full_name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);

  const gradients = [
    "from-primary to-emerald-400",
    "from-blue-500 to-cyan-400",
    "from-violet-500 to-purple-400",
    "from-amber-500 to-orange-400",
    "from-rose-500 to-pink-400",
    "from-teal-500 to-green-400",
  ];
  const gradient = gradients[index % gradients.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
    >
      <Link to={`/masters/${master.id}`}>
        <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden cursor-pointer border-border/50">
          <CardContent className="p-0">
            {/* Top gradient bar */}
            <div className={`h-2 bg-gradient-to-r ${gradient}`} />

            <div className="p-5">
              {/* Avatar + name */}
              <div className="flex items-start gap-3.5 mb-4">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-bold shrink-0 shadow-lg`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-foreground text-base group-hover:text-primary transition-colors truncate">
                      {master.full_name}
                    </h3>
                    {master.is_top_master && (
                      <Badge className="bg-amber-100 text-amber-800 gap-0.5 text-[10px] px-1.5 py-0 shrink-0">
                        <Award className="w-3 h-3" /> Топ
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{master.average_rating}</span>
                    <span className="text-xs text-muted-foreground">({master.total_reviews} отзывов)</span>
                    {master.ranking_score > 0 && (
                      <span className="text-[10px] text-muted-foreground/60 ml-1">#{Math.round(master.ranking_score)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{master.experience_years} лет</span>
                    {master.completed_orders > 0 && (
                      <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{master.completed_orders} работ</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {master.service_categories.map((cat) => (
                  <Badge key={cat} variant="secondary" className="text-xs font-medium">
                    {cat}
                  </Badge>
                ))}
              </div>

              {/* Districts */}
              <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{master.working_districts.join(", ")}</span>
              </div>

              {/* Price + actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">от</p>
                  <p className="text-lg font-bold text-foreground">
                    {master.price_min} <span className="text-sm font-normal text-muted-foreground">сомонӣ</span>
                  </p>
                </div>
                <div className="flex gap-1.5 items-center">
                  <Button
                    size="sm"
                    variant={isComparing ? "default" : "outline"}
                    className="rounded-full h-9 w-9 p-0"
                    onClick={(e) => { e.preventDefault(); onToggleCompare(); }}
                    disabled={compareDisabled}
                    title="Сравнить"
                  >
                    <Scale className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full h-9 w-9 p-0"
                    onClick={(e) => { e.preventDefault(); window.open(`tel:${master.phone}`); }}
                  >
                    <Phone className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full h-9 w-9 p-0"
                    onClick={(e) => { e.preventDefault(); window.open(`https://wa.me/${master.phone.replace(/\D/g, "")}`); }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" className="rounded-full h-9 px-4 text-xs">
                    Подробнее
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
