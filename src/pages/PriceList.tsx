import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import OrderModal from "@/components/OrderModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Search, ArrowRight, Wrench, Clock, Star, Zap, Droplets, Paintbrush, Sofa, Hammer,
  Camera, Flame, Home, Cpu, MoreHorizontal, Wind, ChevronDown, ChevronRight,
  Sparkles, Shield, TrendingUp, HelpCircle, DollarSign, MapPin, Ruler, AlertTriangle,
} from "lucide-react";
import { motion } from "framer-motion";

const iconMap: Record<string, React.ElementType> = {
  "Электрика": Zap, "Сантехника": Droplets, "Отделка": Paintbrush, "Мебель и двери": Sofa,
  "Умный дом": Cpu, "Видеонаблюдение": Camera, "Сад и двор": Hammer, "Сварочные работы": Flame,
  "Подвалы и гаражи": Hammer, "Уборка": Paintbrush, "Ремонт под ключ": Home,
  "Аварийные 24/7": AlertTriangle, "Ремонт техники": Wrench, "Кондиционеры": Wind,
  "Отопление": Flame, "Окна и двери": Home, "Малярные работы": Paintbrush,
  "Потолки": Home, "Полы и ламинат": Hammer, "Срочный мастер 24/7": AlertTriangle,
  "Бытовая техника": Cpu, "Другие услуги": MoreHorizontal,
};

interface ServiceCategory {
  id: string;
  name_ru: string;
  name_tj: string;
  name_en: string;
  icon: string;
  color: string;
  sort_order: number;
}

interface Service {
  id: string;
  category_id: string;
  name_ru: string;
  name_tj: string;
  name_en: string;
  price_min: number;
  price_avg: number;
  price_max: number;
  unit: string;
  note: string | null;
  sort_order: number;
}

// Страница прайс-листа собирает все услуги, цены, категории, FAQ и быстрый переход к заказу.
export default function PriceList() {
  const { language, t } = useLanguage();
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderModal, setOrderModal] = useState<{ open: boolean; categoryId?: string; serviceId?: string; name?: string }>({ open: false });

  // При загрузке страницы получаем список категорий и услуг, чтобы построить полный прайс.
  useEffect(() => {
    Promise.all([
      supabase.from("service_categories").select("*").order("sort_order"),
      supabase.from("services").select("*").order("sort_order"),
    ]).then(([catsRes, servicesRes]) => {
      setCategories(catsRes.data || []);
      setServices(servicesRes.data || []);
      setLoading(false);
    });
  }, []);

  const getName = (item: { name_ru: string; name_tj: string; name_en: string }) => {
    if (language === "tj") return item.name_tj || item.name_ru;
    if (language === "en") return item.name_en || item.name_ru;
    return item.name_ru;
  };

  // Если пользователь ввёл запрос, показываем только подходящие услуги по трём языкам.
  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return services.filter(
      (s) => s.name_ru.toLowerCase().includes(q) || s.name_en.toLowerCase().includes(q) || s.name_tj.toLowerCase().includes(q)
    );
  }, [search, services]);

  // Группируем услуги по категориям, чтобы дальше выводить их блоками на странице.
  const groupedByCategory = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) {
      if (!map.has(s.category_id)) map.set(s.category_id, []);
      map.get(s.category_id)!.push(s);
    }
    return map;
  }, [services]);

  // Выбираем несколько популярных услуг для отдельного промо-блока в начале страницы.
  const popularServices = useMemo(() => {
    const popular = [
      "Установка кондиционера", "Ремонт стиральной машины", "Сборка мебели",
      "Прочистка канализации", "Покраска стен", "Установка камеры",
      "Установка розетки", "Замена смесителя",
    ];
    const found = services.filter(s => popular.some(p => s.name_ru.includes(p)));
    if (found.length >= 6) return found.slice(0, 8);
    return services.slice(0, 8);
  }, [services]);

  const displayCategories = activeCategory
    ? categories.filter(c => c.id === activeCategory)
    : categories;

  const priceLabel = language === "en" ? "som." : "сом.";

  const texts = {
    ru: {
      title: "Наши услуги",
      subtitle: "Выберите нужную услугу и закажите проверенного мастера в Душанбе",
      searchPlaceholder: "Поиск: ремонт стиральной машины, установка люстры...",
      allCategories: "Все категории",
      services: "услуг",
      chooseMaster: "Выбрать мастера",
      popularTitle: "Популярные услуги",
      popularSubtitle: "Самые востребованные услуги в Душанбе",
      priceInfoTitle: "Как формируется цена",
      priceComplexity: "Сложность работы",
      priceComplexityDesc: "Стоимость зависит от объёма и сложности задачи. Мастер оценит на месте.",
      priceDistance: "Расстояние",
      priceDistanceDesc: "Выезд по всему Душанбе бесплатный. За пределами города — по договорённости.",
      priceUrgency: "Срочность",
      priceUrgencyDesc: "Срочный вызов в ночное время или праздники может стоить дороже.",
      priceMaterials: "Материалы",
      priceMaterialsDesc: "Расходные материалы оплачиваются отдельно. Мастер подскажет, что нужно.",
      faqTitle: "Часто задаваемые вопросы",
      faq1q: "Сколько стоит вызов мастера?",
      faq1a: "Вызов мастера бесплатный при заказе услуги. Вы платите только за выполненную работу.",
      faq2q: "Как быстро приедет мастер?",
      faq2a: "Обычно мастер приезжает в течение 1 часа по Душанбе. Для срочных вызовов — от 30 минут.",
      faq3q: "Можно ли выбрать конкретного мастера?",
      faq3a: "Да, после выбора услуги вы увидите всех доступных мастеров с рейтингом и отзывами.",
      faq4q: "Есть ли гарантия на работу?",
      faq4a: "Да, на все работы действует гарантия. Если что-то не устроит — мастер вернётся и исправит бесплатно.",
      faq5q: "Как происходит оплата?",
      faq5a: "Оплата наличными или переводом после выполнения работы. Никаких предоплат.",
      results: "результатов",
      from: "аз",
      viewMasters: "Посмотреть мастеров",
    },
    tj: {
      title: "Хидматҳои мо",
      subtitle: "Хидмати лозимиро интихоб кунед ва устои тасдиқшударо дар Душанбе фармоиш диҳед",
      searchPlaceholder: "Ҷустуҷӯ: таъмири мошини ҷомашӯй, насби люстра...",
      allCategories: "Ҳамаи категорияҳо",
      services: "хидмат",
      chooseMaster: "Усторо интихоб кунед",
      popularTitle: "Хидматҳои маъмул",
      popularSubtitle: "Хидматҳои аз ҳама талабшаванда дар Душанбе",
      priceInfoTitle: "Нарх чӣ тавр муайян мешавад",
      priceComplexity: "Мушкилии кор",
      priceComplexityDesc: "Нарх аз ҳаҷм ва мушкилии вазифа вобаста аст. Усто дар ҷойи кор баҳо медиҳад.",
      priceDistance: "Масофа",
      priceDistanceDesc: "Баромадан дар тамоми Душанбе ройгон. Берун аз шаҳр — бо мувофиқа.",
      priceUrgency: "Зудият",
      priceUrgencyDesc: "Даъвати зудӣ дар шаб ё рӯзҳои идонаҳ метавонад қимматтар бошад.",
      priceMaterials: "Масолеҳ",
      priceMaterialsDesc: "Масолеҳи сарфшаванда алоҳида пардохт мешавад. Усто маслиҳат медиҳад.",
      faqTitle: "Саволҳои зуд-зуд додашаванда",
      faq1q: "Даъвати усто чанд аст?",
      faq1a: "Даъвати усто ҳангоми фармоиши хидмат ройгон аст. Шумо танҳо барои кори иҷрошуда пул медиҳед.",
      faq2q: "Усто чӣ қадар зуд меояд?",
      faq2a: "Одатан усто дар давоми 1 соат дар Душанбе меояд. Барои даъватҳои зудӣ — аз 30 дақиқа.",
      faq3q: "Оё усторо худам интихоб карда метавонам?",
      faq3a: "Бале, пас аз интихоби хидмат шумо ҳамаи устоони дастрасро бо рейтинг ва шарҳҳо мебинед.",
      faq4q: "Оё барои кор кафолат ҳаст?",
      faq4a: "Бале, барои ҳамаи корҳо кафолат амал мекунад. Агар чизе маъқул нашавад — усто бармегардад.",
      faq5q: "Пардохт чӣ тавр сурат мегирад?",
      faq5a: "Пардохт нақд ё интиқол пас аз иҷрои кор. Ҳеҷ пешпардохте нест.",
      results: "натиҷа",
      from: "аз",
      viewMasters: "Устоонро дидан",
    },
    en: {
      title: "Our Services",
      subtitle: "Choose the service you need and book a verified master in Dushanbe",
      searchPlaceholder: "Search: washing machine repair, chandelier installation...",
      allCategories: "All Categories",
      services: "services",
      chooseMaster: "Choose Master",
      popularTitle: "Popular Services",
      popularSubtitle: "Most requested services in Dushanbe",
      priceInfoTitle: "How Pricing Works",
      priceComplexity: "Job Complexity",
      priceComplexityDesc: "Cost depends on the scope and complexity. The master evaluates on-site.",
      priceDistance: "Distance",
      priceDistanceDesc: "Travel within Dushanbe is free. Outside the city — by arrangement.",
      priceUrgency: "Urgency",
      priceUrgencyDesc: "Emergency calls at night or holidays may cost more.",
      priceMaterials: "Materials",
      priceMaterialsDesc: "Consumable materials are charged separately. The master will advise what's needed.",
      faqTitle: "Frequently Asked Questions",
      faq1q: "How much does a master visit cost?",
      faq1a: "The master visit is free when ordering a service. You only pay for completed work.",
      faq2q: "How fast will the master arrive?",
      faq2a: "Usually within 1 hour in Dushanbe. For emergency calls — from 30 minutes.",
      faq3q: "Can I choose a specific master?",
      faq3a: "Yes, after selecting a service you'll see all available masters with ratings and reviews.",
      faq4q: "Is there a work guarantee?",
      faq4a: "Yes, all work is guaranteed. If something is not right — the master will return and fix it for free.",
      faq5q: "How does payment work?",
      faq5a: "Payment in cash or transfer after the work is done. No prepayments.",
      results: "results",
      from: "from",
      viewMasters: "View masters",
    },
  };

  const tx = texts[language];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Верхний блок кратко объясняет страницу и даёт быстрый поиск по услугам. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/30 pt-8 pb-12 md:pt-16 md:pb-20">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="container px-4 mx-auto max-w-5xl relative">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 text-sm px-4 py-1">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              {services.length}+ {tx.services}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-3 tracking-tight">{tx.title}</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{tx.subtitle}</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={tx.searchPlaceholder}
                value={search}
                onChange={(e) => { setSearch(e.target.value); setActiveCategory(null); }}
                className="pl-12 h-14 text-base rounded-2xl border-border/50 shadow-lg shadow-primary/5 bg-card focus-visible:ring-primary/30"
              />
              {search && (
                <Button
                  variant="ghost" size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 p-0"
                  onClick={() => setSearch("")}
                >
                  ×
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Панель категорий помогает быстро переключаться между разделами прайса. */}
      <section className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container px-4 mx-auto max-w-5xl">
          <div className="flex gap-2 py-3 overflow-x-auto scrollbar-hide">
            <Button
              variant={activeCategory === null && !search ? "default" : "outline"}
              size="sm"
              className="rounded-full whitespace-nowrap shrink-0 text-xs"
              onClick={() => { setActiveCategory(null); setSearch(""); }}
            >
              {tx.allCategories}
            </Button>
            {categories.map((cat) => {
              const Icon = iconMap[cat.name_ru] || Wrench;
              return (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  className="rounded-full whitespace-nowrap shrink-0 text-xs gap-1.5"
                  onClick={() => { setActiveCategory(cat.id); setSearch(""); }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {getName(cat)}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="container px-4 mx-auto max-w-5xl py-8 space-y-16">

        {/* Search results */}
        {filtered && (
          <section>
            <p className="text-sm text-muted-foreground mb-4">
              {filtered.length} {tx.results}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  getName={getName}
                  priceLabel={priceLabel}
                  fromLabel={tx.from}
                  chooseMasterLabel={tx.chooseMaster}
                  viewMastersLabel={tx.viewMasters}
                  category={categories.find(c => c.id === s.category_id)}
                />
              ))}
            </div>
            {filtered.length === 0 && (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                {language === "en" ? "No services found. Try another search." : "Услуги не найдены. Попробуйте другой запрос."}
              </CardContent></Card>
            )}
          </section>
        )}

        {/* Блок популярных услуг показываем только когда пользователь ещё не сузил выдачу. */}
        {!filtered && !activeCategory && (
          <section>
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                {tx.popularTitle}
              </h2>
              <p className="text-muted-foreground">{tx.popularSubtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {popularServices.map((s, i) => {
                const cat = categories.find(c => c.id === s.category_id);
                const Icon = cat ? (iconMap[cat.name_ru] || Wrench) : Wrench;
                const color = cat?.color || "from-primary to-emerald-400";
                return (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3) }}
                  >
                    <Link to={`/service/${s.id}`}>
                      <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden h-full">
                        <div className={`h-1.5 bg-gradient-to-r ${color}`} />
                        <CardContent className="p-4">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-3 shadow-md group-hover:scale-110 transition-transform`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-foreground text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">
                            {getName(s)}
                          </h3>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {tx.from} {s.price_min} {priceLabel}
                            </Badge>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}

        {/* Main catalog */}
        {!filtered && (
          <section>
            {!activeCategory && (
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">
                {language === "en" ? "All Services by Category" : language === "tj" ? "Ҳамаи хидматҳо аз рӯи категория" : "Все услуги по категориям"}
              </h2>
            )}

            <div className="space-y-4">
              {displayCategories.map((cat) => {
                const catServices = groupedByCategory.get(cat.id) || [];
                const Icon = iconMap[cat.name_ru] || Wrench;
                if (catServices.length === 0) return null;

                if (activeCategory) {
                  // Expanded view for active category
                  return (
                    <motion.div key={cat.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{getName(cat)}</h3>
                          <p className="text-sm text-muted-foreground">{catServices.length} {tx.services}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {catServices.map((s) => (
                          <ServiceCard
                            key={s.id}
                            service={s}
                            getName={getName}
                            priceLabel={priceLabel}
                            fromLabel={tx.from}
                            chooseMasterLabel={tx.chooseMaster}
                            viewMastersLabel={tx.viewMasters}
                            category={cat}
                          />
                        ))}
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <Accordion key={cat.id} type="single" collapsible>
                    <AccordionItem value={cat.id} className="border rounded-2xl overflow-hidden bg-card shadow-sm">
                      <AccordionTrigger className="hover:no-underline px-4 sm:px-5 py-4">
                        <div className="flex items-center gap-3 flex-1">
                          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-md`}>
                            <Icon className="w-5.5 h-5.5 text-white" />
                          </div>
                          <div className="text-left flex-1">
                            <p className="font-bold text-foreground text-base">{getName(cat)}</p>
                            <p className="text-xs text-muted-foreground">{catServices.length} {tx.services}</p>
                          </div>
                          <Badge variant="outline" className="text-xs mr-2 hidden sm:flex">
                            {tx.from} {Math.min(...catServices.map(s => s.price_min))} {priceLabel}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-4 sm:px-5 pb-4">
                          {catServices.map((s) => (
                            <ServiceCard
                              key={s.id}
                              service={s}
                              getName={getName}
                              priceLabel={priceLabel}
                              fromLabel={tx.from}
                              chooseMasterLabel={tx.chooseMaster}
                              viewMastersLabel={tx.viewMasters}
                              category={cat}
                              compact
                            />
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                );
              })}
            </div>
          </section>
        )}

        {/* Price info block */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              {tx.priceInfoTitle}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { icon: Ruler, title: tx.priceComplexity, desc: tx.priceComplexityDesc, color: "from-blue-500 to-cyan-400" },
              { icon: MapPin, title: tx.priceDistance, desc: tx.priceDistanceDesc, color: "from-emerald-500 to-green-400" },
              { icon: Clock, title: tx.priceUrgency, desc: tx.priceUrgencyDesc, color: "from-amber-500 to-orange-400" },
              { icon: Wrench, title: tx.priceMaterials, desc: tx.priceMaterialsDesc, color: "from-violet-500 to-purple-400" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <Card className="h-full border-border/50 hover:shadow-lg transition-shadow">
                  <CardContent className="p-5 text-center">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-3 shadow-md`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ закрывает типовые вопросы о ценах, выезде мастера и оплате. */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
              <HelpCircle className="w-6 h-6 text-primary" />
              {tx.faqTitle}
            </h2>
          </div>
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="space-y-2">
              {[
                { q: tx.faq1q, a: tx.faq1a },
                { q: tx.faq2q, a: tx.faq2a },
                { q: tx.faq3q, a: tx.faq3a },
                { q: tx.faq4q, a: tx.faq4a },
                { q: tx.faq5q, a: tx.faq5a },
              ].map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-4 bg-card">
                  <AccordionTrigger className="hover:no-underline py-4 text-left font-semibold text-foreground">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground pb-2">{faq.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* CTA */}
        <section>
          <Card className="bg-gradient-to-br from-primary/10 via-accent/50 to-primary/5 border-primary/20">
            <CardContent className="py-10 text-center">
              <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="text-xl font-bold text-foreground mb-2">
                {language === "en" ? "Can't find the right service?" : language === "tj" ? "Хидмати лозимиро пайдо накардед?" : "Не нашли нужную услугу?"}
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                {language === "en" ? "Leave a request and we'll find a master for any task in Dushanbe" : language === "tj" ? "Дархост гузоред ва мо барои ҳар кори дар Душанбе усто пайдо мекунем" : "Оставьте заявку и мы подберём мастера для любой задачи в Душанбе"}
              </p>
              <Button
                size="lg"
                className="rounded-full px-8"
                onClick={() => setOrderModal({ open: true })}
              >
                {language === "en" ? "Leave a Request" : language === "tj" ? "Дархост гузоред" : "Оставить заявку"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>

      <Footer />
      <OrderModal
        isOpen={orderModal.open}
        onClose={() => setOrderModal({ open: false })}
        category={null}
        categoryId={orderModal.categoryId}
        serviceId={orderModal.serviceId}
        initialServiceName={orderModal.name}
      />
    </div>
  );
}

function ServiceCard({ service, getName, priceLabel, fromLabel, chooseMasterLabel, viewMastersLabel, category, compact }: {
  service: Service;
  getName: (s: { name_ru: string; name_tj: string; name_en: string }) => string;
  priceLabel: string;
  fromLabel: string;
  chooseMasterLabel: string;
  viewMastersLabel: string;
  category?: ServiceCategory;
  compact?: boolean;
}) {
  const color = category?.color || "from-primary to-emerald-400";
  const Icon = category ? (iconMap[category.name_ru] || Wrench) : Wrench;

  return (
    <Link to={`/service/${service.id}`}>
      <Card className={`group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer border-border/50 h-full ${compact ? '' : ''}`}>
        <CardContent className={compact ? "p-3" : "p-4"}>
          <div className="flex items-start gap-3">
            {!compact && (
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform`}>
                <Icon className="w-4.5 h-4.5 text-white" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors line-clamp-1">
                {getName(service)}
              </h4>
              {service.note && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{service.note}</p>}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {fromLabel} {service.price_min} {priceLabel}
                </Badge>
                <span className="text-xs text-muted-foreground">/{service.unit}</span>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="rounded-full h-8 w-8 p-0 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-4 h-4 text-primary" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

