import { useState, useEffect } from "react";
import QuickBooking from "@/components/QuickBooking";
import AiMasterMatch from "@/components/AiMasterMatch";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Services } from "@/components/Services";
import OrderModal from "@/components/OrderModal";
import { TopMastersWeek, TopProducts } from "@/components/homepage/RankingSections";
import { fallbackShopProducts } from "@/data/shopFallback";
import {
  Clock, Shield, Star, CheckCircle,
  Phone, Siren, Search, FileText, Truck, ArrowRight, Users, MapPin, Quote, Brain,
  Sparkles, Zap, ChevronRight,
} from "lucide-react";

interface PopularMaster {
  id: string;
  full_name: string;
  average_rating: number;
  total_reviews: number;
  experience_years: number;
  service_categories: string[];
  working_districts: string[];
  price_min: number;
}

interface SearchResult {
  type: "category" | "service" | "product";
  id: string;
  name: string;
  parentName?: string;
  parentId?: string;
}

// Главная страница знакомит пользователя с сервисом, поиском, популярными мастерами и быстрым заказом.
const Index = () => {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedServiceName, setSelectedServiceName] = useState("");
  const [quickBookOpen, setQuickBookOpen] = useState(false);
  const [aiMatchOpen, setAiMatchOpen] = useState(false);

  const [popularMasters, setPopularMasters] = useState<PopularMaster[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);

  // При открытии главной страницы загружаем популярных мастеров и справочники
  // категорий/услуг, чтобы дальше использовать их в умном поиске и витрине.
  useEffect(() => {
    supabase
      .from("master_listings")
      .select("id, full_name, average_rating, total_reviews, experience_years, service_categories, working_districts, price_min")
      .eq("is_active", true)
      .order("average_rating", { ascending: false })
      .limit(6)
      .then(({ data }) => setPopularMasters((data as PopularMaster[]) || []));

    Promise.all([
      supabase.from("service_categories").select("id, name_ru, name_tj, name_en"),
      supabase.from("services").select("id, name_ru, name_tj, name_en, category_id"),
    ]).then(([catRes, svcRes]) => {
      setAllCategories(catRes.data || []);
      setAllServices(svcRes.data || []);
    });
  }, []);

  // Этот эффект строит подсказки поиска по категориям, услугам и бытовым ключевым словам.
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    for (const cat of allCategories) {
      const name = language === "tj" ? cat.name_tj : language === "en" ? cat.name_en : cat.name_ru;
      if (name.toLowerCase().includes(q)) {
        results.push({ type: "category", id: cat.id, name });
      }
    }

    for (const svc of allServices) {
      const name = language === "tj" ? svc.name_tj : language === "en" ? svc.name_en : svc.name_ru;
      if (name.toLowerCase().includes(q)) {
        const cat = allCategories.find((c: any) => c.id === svc.category_id);
        const catName = cat ? (language === "tj" ? cat.name_tj : language === "en" ? cat.name_en : cat.name_ru) : "";
        results.push({ type: "service", id: svc.id, name, parentName: catName, parentId: cat?.id });
      }
    }

    const keywordMap: Record<string, string[]> = {
      "течет": ["Сантехника"], "кран": ["Сантехника"], "труб": ["Сантехника"], "унитаз": ["Сантехника"],
      "розетк": ["Электрика"], "свет": ["Электрика"], "провод": ["Электрика"],
      "мебел": ["Мебель и двери"], "шкаф": ["Мебель и двери"], "дверь": ["Мебель и двери"],
      "стирал": ["Ремонт техники"], "холодил": ["Ремонт техники"],
      "кондиционер": ["Кондиционеры"], "отоплен": ["Отопление"],
      "убор": ["Уборка"], "камер": ["Видеонаблюдение"], "сварк": ["Сварочные работы"],
    };

    if (results.length === 0) {
      for (const [keyword, catNames] of Object.entries(keywordMap)) {
        if (q.includes(keyword)) {
          for (const catName of catNames) {
            const cat = allCategories.find((c: any) => c.name_ru === catName);
            if (cat) {
              const name = language === "tj" ? cat.name_tj : language === "en" ? cat.name_en : cat.name_ru;
              results.push({ type: "category", id: cat.id, name: `${name} — ${t("matchingCategory")}` });
              const matchingSvcs = allServices.filter((s: any) => s.category_id === cat.id).slice(0, 3);
              for (const svc of matchingSvcs) {
                const svcName = language === "tj" ? svc.name_tj : language === "en" ? svc.name_en : svc.name_ru;
                results.push({ type: "service", id: svc.id, name: svcName, parentName: name, parentId: cat.id });
              }
            }
          }
        }
      }
    }

    if (results.length < 8) {
      for (const product of fallbackShopProducts) {
        if (product.name.toLowerCase().includes(q) || (product.description || "").toLowerCase().includes(q)) {
          results.push({ 
            type: "product", 
            id: product.id, 
            name: product.name, 
            parentName: product.shop_categories?.name 
          });
          if (results.length >= 8) break;
        }
      }
    }

    setSearchResults(results.slice(0, 8));
    setShowSearchResults(results.length > 0);
  }, [searchQuery, allCategories, allServices, language]);

  // После выбора подсказки переводим пользователя на страницу нужной категории или услуги.
  const handleSearchSelect = (result: SearchResult) => {
    setShowSearchResults(false);
    setSearchQuery("");
    if (result.type === "category") navigate(`/category/${result.id}`);
    else if (result.type === "service") navigate(`/service/${result.id}`);
    else navigate(`/shop/product/${result.id}`);
  };

  // Быстрый заказ открывает форму без жёсткой привязки к услуге.
  const handleQuickOrder = () => {
    setSelectedCategory("other");
    setSelectedServiceName("");
    setIsOrderModalOpen(true);
  };

  const steps = [
    { icon: Search, titleKey: "howItWorksStep1Title", descKey: "howItWorksStep1Desc" },
    { icon: FileText, titleKey: "howItWorksStep2Title", descKey: "howItWorksStep2Desc" },
    { icon: Truck, titleKey: "howItWorksStep3Title", descKey: "howItWorksStep3Desc" },
  ];

  const testimonials = [
    { name: "Мадина Раҳимова", text: "Усто дар 40 дақиқа расид ва дар як соат ҳамаашро таъмир кард. Нарх — 150 сомонӣ, бе ягон доплата. Хеле мамнунам!", rating: 5 },
    { name: "Фирдавс Каримов", text: "Барқкор мушкилиро пайдо кард, ки дигарон наметавонистанд. 3 розетка насб кард — ҳар кадом 30 сомонӣ. Тавсия медиҳам!", rating: 5 },
    { name: "Нигора Саидова", text: "Тозакунии хонаро фармоиш додам — ҳама чиз медурахшад! 15 сомонӣ/м². Боз истифода мебарам.", rating: 5 },
  ];

  const gradients = [
    "from-primary to-emerald-400",
    "from-blue-500 to-cyan-400",
    "from-violet-500 to-purple-400",
    "from-amber-500 to-orange-400",
    "from-rose-500 to-pink-400",
    "from-teal-500 to-green-400",
  ];

  // Эти карточки используются в hero-блоке как визуальная витрина мастеров.
  const floatingCards = [
    { name: "Фирдавс К.", spec: "Электрика", rating: 4.9, delay: 0 },
    { name: "Рустам А.", spec: "Сантехника", rating: 4.8, delay: 0.3 },
    { name: "Шариф М.", spec: "Кондиционеры", rating: 5.0, delay: 0.6 },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Главный экран знакомит с сервисом, показывает преимущества и даёт быстрый старт к заказу. */}
      <section className="relative overflow-hidden hero-mesh noise">
        <div className="container px-4 mx-auto relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 items-center min-h-[85vh] py-16 lg:py-0">
            {/* Left side — text + actions */}
            <div className="lg:col-span-6 xl:col-span-5 space-y-8">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              >
                <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 px-4 py-1.5 text-sm font-medium rounded-full">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  {t("heroSubtitle")}
                </Badge>
                <h1 className="text-5xl md:text-6xl xl:text-7xl font-bold text-foreground leading-[1.05] tracking-tight">
                  {t("heroTitle")}
                </h1>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="text-lg text-muted-foreground max-w-md leading-relaxed"
              >
                {t("heroDescription")}
              </motion.p>

              {/* Поисковая строка подсказывает категории и услуги прямо на главной странице. */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.25 }}
                className="relative max-w-lg"
              >
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-primary-glow/20 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-sm" />
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                      onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
                      placeholder={t("searchPlaceholder")}
                      className="h-14 pl-12 pr-4 text-base rounded-2xl border-2 border-border bg-card focus:border-primary shadow-soft"
                    />
                  </div>
                </div>
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-2xl shadow-elevated z-50 overflow-hidden">
                    {searchResults.map((r, i) => (
                      <button
                        key={`${r.type}-${r.id}-${i}`}
                        className="w-full px-4 py-3 text-left hover:bg-accent transition-colors flex items-center gap-3 border-b border-border/50 last:border-0"
                        onMouseDown={() => handleSearchSelect(r)}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${r.type === "category" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          {r.type === "category" ? <Users className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.name}</p>
                          {r.parentName && <p className="text-xs text-muted-foreground">{r.parentName}</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Основные кнопки ведут к быстрому заказу, AI-подбору и каталогу мастеров. */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.35 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <Button
                  onClick={handleQuickOrder}
                  size="lg"
                  className="btn-glow rounded-2xl px-8 h-13 text-base font-semibold shadow-glow bg-gradient-to-r from-primary to-primary-glow hover:opacity-90 transition-all"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  {t("heroOrderButton")}
                </Button>
                <Button
                  onClick={() => setAiMatchOpen(true)}
                  variant="outline"
                  size="lg"
                  className="rounded-2xl px-6 h-13 text-base font-semibold border-2 border-primary/25 hover:border-primary hover:bg-primary/5 gap-2"
                >
                  <Brain className="w-5 h-5 text-primary" />
                  {t("aiMasterMatchBtn")}
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] ml-1">{t("aiMasterMatchNew")}</Badge>
                </Button>
              </motion.div>

              {/* Emergency link */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => setQuickBookOpen(true)}
                className="flex items-center gap-2 text-sm text-destructive/80 hover:text-destructive transition-colors group"
              >
                <Siren className="w-4 h-4 group-hover:animate-pulse" />
                <span className="font-medium">{t("heroEmergencyButton")}</span>
                <span className="text-xs opacity-60">— {t("heroEmergencySubtext")}</span>
              </motion.button>
            </div>

            {/* Правая часть hero-блока усиливает визуальную подачу через карточки мастеров и декор. */}
            <div className="hidden lg:block lg:col-span-6 xl:col-span-7 relative min-h-[560px]">
              {/* Декоративные фоновые элементы делают первый экран живее и объёмнее. */}
              <div className="absolute top-10 right-10 w-72 h-72 bg-primary/8 rounded-full blur-3xl" />
              <div className="absolute bottom-20 left-0 w-56 h-56 bg-blue-500/6 rounded-full blur-3xl" />
              <div className="absolute top-1/2 right-1/3 w-40 h-40 bg-violet-500/5 rounded-full blur-2xl" />

              {/* Плавающие карточки имитируют активную платформу с реальными мастерами. */}
              {floatingCards.map((card, i) => (
                <motion.div
                  key={card.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.4 + card.delay, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute glass-card rounded-2xl p-5 w-64 ${
                    i === 0 ? "top-4 left-1/2 -translate-x-1/2 animate-float" :
                    i === 1 ? "top-1/2 -translate-y-1/2 -left-4 animate-float-delayed" :
                    "bottom-4 left-1/2 -translate-x-1/2 animate-float"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {card.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{card.name}</p>
                      <p className="text-xs text-muted-foreground">{card.spec}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-semibold">{card.rating}</span>
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-0">
                      <CheckCircle className="w-3 h-3 mr-0.5" /> {t("verified") || "Проверен"}
                    </Badge>
                  </div>
                </motion.div>
              ))}

              {/* Stats floating card - Part of the circle (Right side) */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 20 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
                className="absolute top-1/2 -translate-y-1/2 -right-4 glass-card rounded-2xl p-5 min-w-[200px] animate-float-delayed shadow-elevated border-primary/10 border-2"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-3xl font-black text-foreground leading-none tracking-tighter">{t("trustTime")}</p>
                    <p className="text-[11px] text-muted-foreground font-bold uppercase tracking-widest mt-1.5 opacity-80">{t("trustTimeDesc")}</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Mobile-only trust stats */}
        <div className="lg:hidden pb-12">
          <div className="container px-4 mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                { icon: Clock, value: t("trustTime"), desc: t("trustTimeDesc"), color: "text-primary bg-primary/10" },
                { icon: Star, value: t("trustRating"), desc: t("trustRatingDesc"), color: "text-amber-500 bg-amber-500/10" },
                { icon: CheckCircle, value: t("trustOrders"), desc: t("trustOrdersDesc"), color: "text-blue-500 bg-blue-500/10" },
              ].map((stat, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 text-center">
                  <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{stat.desc}</p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section className="py-20 relative">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{t("categoriesTitle")}</h2>
              <p className="text-muted-foreground mt-2 max-w-md">{t("categoriesDescription")}</p>
            </div>
            <Link to="/categories" className="inline-flex items-center text-primary hover:text-primary/80 font-semibold text-sm gap-1 group">
              {t("viewAllCategories")}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
        <Services />
      </section>

      {/* ── TOP MASTERS ── */}
      <TopMastersWeek />

      {/* ── TOP PRODUCTS ── */}
      <TopProducts />

      {/* ── POPULAR MASTERS ── */}
      {popularMasters.length > 0 && (
        <section className="py-20 bg-background relative">
          <div className="container px-4 mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10"
            >
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{t("topMasters")}</h2>
                <p className="text-muted-foreground mt-2">{t("topMastersDesc")}</p>
              </div>
              <Link to="/masters" className="inline-flex items-center text-primary hover:text-primary/80 font-semibold text-sm gap-1 group">
                {t("viewAllMasters")}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {popularMasters.map((master, i) => {
                const initials = master.full_name.split(" ").map(w => w[0]).join("").slice(0, 2);
                const gradient = gradients[i % gradients.length];
                return (
                  <motion.div key={master.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                    <Link to={`/masters/${master.id}`}>
                      <Card className="group glass-card border-border/50 rounded-2xl overflow-hidden">
                        <div className={`h-1 bg-gradient-to-r ${gradient}`} />
                        <CardContent className="p-5">
                          <div className="flex items-center gap-3.5 mb-3">
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold shadow-md`}>
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-foreground group-hover:text-primary transition-colors">{master.full_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold text-sm">{master.average_rating}</span>
                                <span className="text-xs text-muted-foreground">({master.total_reviews})</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {master.experience_years} {t("yearsShort")}</span>
                            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {master.working_districts?.[0]}</span>
                            <span className="ml-auto font-semibold text-foreground">{t("fromPrice")} {master.price_min} {t("currencySomoni")}</span>
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
      )}

      {/* ── HOW IT WORKS ── asymmetric step layout */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-background" />
        <div className="container px-4 mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground tracking-tight">{t("howItWorksTitle")}</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-10">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className={`relative ${index === 1 ? "md:mt-8" : index === 2 ? "md:mt-16" : ""}`}
                >
                  <div className="glass-card rounded-3xl p-8 h-full">
                    <span className="text-7xl font-bold text-primary/10 absolute top-4 right-6 font-display">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-glow mb-6">
                      <Icon className="w-8 h-8 text-primary-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-3">{t(step.titleKey)}</h3>
                    <p className="text-muted-foreground leading-relaxed">{t(step.descKey)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── offset grid */}
      <section className="py-20 bg-background">
        <div className="container px-4 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">{t("clientReviews")}</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((review, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={i === 1 ? "md:-mt-6" : ""}
              >
                <Card className="glass-card border-border/50 rounded-2xl h-full">
                  <CardContent className="p-6">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <Quote className="w-8 h-8 text-primary/15 mb-2" />
                    <p className="text-foreground leading-relaxed mb-4">{review.text}</p>
                    <p className="text-sm font-semibold text-muted-foreground">— {review.name}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GUARANTEE BANNER ── */}
      <section className="py-16 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-glow" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="container px-4 mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col md:flex-row items-center gap-8"
          >
            <div className="w-20 h-20 rounded-3xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">{t("qualityGuarantee")}</h3>
              <p className="text-white/80 text-lg max-w-lg">{t("qualityGuaranteeDesc")}</p>
            </div>
            <Button
              onClick={handleQuickOrder}
              size="lg"
              className="rounded-2xl px-10 h-14 bg-white text-primary hover:bg-white/90 font-bold shadow-2xl text-base flex-shrink-0"
            >
              {t("heroOrderButton")}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />

      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => { setIsOrderModalOpen(false); setSelectedCategory(null); setSelectedServiceName(""); }}
        category={selectedCategory}
        initialServiceName={selectedServiceName}
      />
      <QuickBooking open={quickBookOpen} onOpenChange={setQuickBookOpen} />
      <AiMasterMatch open={aiMatchOpen} onOpenChange={setAiMatchOpen} />
    </div>
  );
};

export default Index;
