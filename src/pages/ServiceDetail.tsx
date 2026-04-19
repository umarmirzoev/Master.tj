import { useState, useEffect, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Star, MapPin, Clock, Phone,
  Users, Wrench, CheckCircle, Loader2, Filter, Map as MapIcon, List, X,
} from "lucide-react";

interface Service {
  id: string;
  category_id: string;
  name_ru: string;
  name_tj: string;
  name_en: string;
  price_min: number;
  price_max: number;
  unit: string;
}

interface CategoryInfo {
  id: string;
  name_ru: string;
  name_tj: string;
  name_en: string;
  color: string;
}

interface MasterListing {
  id: string;
  full_name: string;
  phone: string;
  bio: string;
  avatar_url: string;
  service_categories: string[];
  working_districts: string[];
  experience_years: number;
  average_rating: number;
  total_reviews: number;
  price_min: number;
  price_max: number;
  latitude: number | null;
  longitude: number | null;
}

const districts = ["Сино", "Фирдавси", "Шохмансур", "Исмоили Сомони", "Пригород"];
const ITEMS_PER_PAGE = 12;

// Страница услуги показывает мастеров по конкретной услуге, фильтры, карту и форму бронирования.
export default function ServiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [service, setService] = useState<Service | null>(null);
  const [category, setCategory] = useState<CategoryInfo | null>(null);
  const [masters, setMasters] = useState<MasterListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "map">("list");
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [minRating, setMinRating] = useState(0);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [minExperience, setMinExperience] = useState(0);
  const [filterDistrict, setFilterDistrict] = useState<string>("all");

  // Booking state
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedMaster, setSelectedMaster] = useState<MasterListing | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [bPhone, setBPhone] = useState("");
  const [bAddress, setBAddress] = useState("");
  const [bDistrict, setBDistrict] = useState("");
  const [bDesc, setBDesc] = useState("");
  const [bDate, setBDate] = useState("");

  // Загружаем саму услугу, её категорию и список подходящих мастеров по этой специализации.
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data: svcData } = await supabase
        .from("services").select("*").eq("id", id).maybeSingle();
      if (!svcData) { setLoading(false); return; }
      setService(svcData as Service);

      const { data: catData } = await supabase
        .from("service_categories").select("*").eq("id", svcData.category_id).maybeSingle();
      setCategory(catData as CategoryInfo | null);

      const catName = catData?.name_ru || "";
      const { data: mastersData } = await supabase
        .from("master_listings").select("*")
        .eq("is_active", true)
        .contains("service_categories", [catName])
        .order("average_rating", { ascending: false })
        .limit(500);

      setMasters((mastersData as unknown as MasterListing[]) || []);
      setLoading(false);
    };
    load();
  }, [id]);

  const getName = (item: { name_ru: string; name_tj: string; name_en: string }) => {
    if (language === "tj") return item.name_tj || item.name_ru;
    if (language === "en") return item.name_en || item.name_ru;
    return item.name_ru;
  };

  // Здесь оставляем только тех мастеров, которые проходят по рейтингу, цене, опыту и району.
  const filteredMasters = useMemo(() => {
    return masters.filter(m => {
      if (m.average_rating < minRating) return false;
      if (m.price_min > priceRange[1] || m.price_max < priceRange[0]) return false;
      if (m.experience_years < minExperience) return false;
      if (filterDistrict !== "all" && !m.working_districts.includes(filterDistrict)) return false;
      return true;
    });
  }, [masters, minRating, priceRange, minExperience, filterDistrict]);

  // Пагинация реализована через постепенную подгрузку следующей порции карточек на странице.
  const paginatedMasters = useMemo(() => {
    return filteredMasters.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredMasters, page]);

  const hasMore = paginatedMasters.length < filteredMasters.length;

  const resetFilters = () => {
    setMinRating(0);
    setPriceRange([0, 5000]);
    setMinExperience(0);
    setFilterDistrict("all");
  };

  // Считаем число активных фильтров, чтобы показать его в интерфейсе и упростить сброс.
  const activeFilterCount = [
    minRating > 0,
    priceRange[0] > 0 || priceRange[1] < 5000,
    minExperience > 0,
    filterDistrict !== "all",
  ].filter(Boolean).length;

  // Отправляем заявку на заказ услуги у выбранного мастера.
  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({ title: "Войдите в аккаунт", variant: "destructive" });
      navigate("/auth");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({
      client_id: user.id,
      service_id: service?.id || null,
      category_id: category?.id || null,
      description: `${service ? getName(service) : ""}${selectedMaster ? ` — Мастер: ${selectedMaster.full_name}` : ""}. ${bDesc}`,
      address: `${bDistrict ? bDistrict + ", " : ""}${bAddress}`,
      phone: bPhone,
      preferred_time: bDate,
      status: "new",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }
    setBookingDone(true);
    toast({ title: "Заявка отправлена. Мастер скоро свяжется с вами." });
    setTimeout(() => {
      setBookingOpen(false);
      setBookingDone(false);
      setSelectedMaster(null);
    }, 2500);
  };

  // При открытии формы бронирования подставляем мастера и очищаем предыдущие значения формы.
  const openBooking = (master: MasterListing | null) => {
    setSelectedMaster(master);
    setBookingOpen(true);
    setBookingDone(false);
    setBPhone(""); setBAddress(""); setBDistrict(""); setBDesc(""); setBDate("");
  };

  const gradients = [
    "from-primary to-emerald-400",
    "from-blue-500 to-cyan-400",
    "from-violet-500 to-purple-400",
    "from-amber-500 to-orange-400",
    "from-rose-500 to-pink-400",
    "from-teal-500 to-green-400",
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-lg text-muted-foreground">Услуга не найдена</p>
          <Button onClick={() => navigate("/categories")} variant="outline" className="mt-4 rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> К категориям
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="py-8 md:py-12">
        <div className="container px-4 mx-auto max-w-6xl">
          {/* Хлебные крошки помогают вернуться в категорию и понять место услуги в структуре каталога. */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap">
            <Link to="/categories" className="hover:text-foreground transition-colors">Категории</Link>
            <span>/</span>
            {category && (
              <>
                <Link to={`/category/${category.id}`} className="hover:text-foreground transition-colors">{getName(category)}</Link>
                <span>/</span>
              </>
            )}
            <span className="text-foreground font-medium">{getName(service)}</span>
          </div>

          {/* Шапка услуги показывает название, цену, категорию и краткое позиционирование. */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <Card className="overflow-hidden">
              <div className={`h-2 bg-gradient-to-r ${category?.color || "from-primary to-emerald-400"}`} />
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category?.color || "from-primary to-emerald-400"} flex items-center justify-center shrink-0`}>
                    <Wrench className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-foreground">{getName(service)}</h1>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-sm">
                        {service.price_min}–{service.price_max} {language === "en" ? "som." : "сом."}/{service.unit}
                      </Badge>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="w-4 h-4" /> {filteredMasters.length} мастеров
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => openBooking(null)} 
                    className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
                  >
                    Быстрый заказ услуги
                  </Button>
                  <Button variant="outline" className="rounded-full px-6 h-12" onClick={() => navigate("/categories")}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Другие услуги
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Toolbar: filters + view toggle */}
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Мастера для «{getName(service)}»
            </h2>
            <div className="flex items-center gap-2">
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="rounded-full"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-1" />
                Фильтры
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              <div className="flex border border-input rounded-full overflow-hidden">
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-8 px-3"
                  onClick={() => setViewMode("list")}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "map" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-8 px-3"
                  onClick={() => setViewMode("map")}
                >
                  <MapIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Filters panel */}
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Card className="mb-6">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-foreground">Фильтры</span>
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs">
                      <X className="w-3 h-3 mr-1" /> Сбросить
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Rating */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Рейтинг от {minRating > 0 ? minRating : "любой"}
                      </label>
                      <Slider
                        value={[minRating]}
                        onValueChange={([v]) => setMinRating(v)}
                        min={0} max={5} step={0.5}
                        className="mt-2"
                      />
                    </div>
                    {/* Price */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Цена: {priceRange[0]}–{priceRange[1]} сом.
                      </label>
                      <Slider
                        value={priceRange}
                        onValueChange={(v) => setPriceRange(v as [number, number])}
                        min={0} max={5000} step={50}
                        className="mt-2"
                      />
                    </div>
                    {/* Experience */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Опыт от {minExperience > 0 ? `${minExperience} лет` : "любой"}
                      </label>
                      <Slider
                        value={[minExperience]}
                        onValueChange={([v]) => setMinExperience(v)}
                        min={0} max={20} step={1}
                        className="mt-2"
                      />
                    </div>
                    {/* District */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Район</label>
                      <Select value={filterDistrict} onValueChange={setFilterDistrict}>
                        <SelectTrigger>
                          <SelectValue placeholder="Все районы" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все районы</SelectItem>
                          {districts.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Map view */}
          {viewMode === "map" && (
            <MastersMap
              masters={filteredMasters}
              onBookMaster={openBooking}
              gradients={gradients}
            />
          )}

          {/* List view */}
          {viewMode === "list" && (
            <>
              {filteredMasters.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">Мастера не найдены. Попробуйте изменить фильтры.</p>
                    {activeFilterCount > 0 && (
                      <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={resetFilters}>
                        Сбросить фильтры
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedMasters.map((master, index) => {
                      const initials = master.full_name.split(" ").map(w => w[0]).join("").slice(0, 2);
                      const gradient = gradients[index % gradients.length];
                      return (
                        <motion.div
                          key={master.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
                        >
                          <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 overflow-hidden">
                            <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex items-start gap-3 mb-3">
                                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md`}>
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <Link to={`/masters/${master.id}`} className="font-bold text-foreground hover:text-primary transition-colors truncate block">
                                    {master.full_name}
                                  </Link>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                    <span className="text-sm font-semibold">{master.average_rating}</span>
                                    <span className="text-xs text-muted-foreground">({master.total_reviews})</span>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" /> {master.experience_years} сол таҷриба
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5" />
                                  <span className="truncate">{master.working_districts.join(", ")}</span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                <div>
                                  <p className="text-xs text-muted-foreground">аз</p>
                                  <p className="text-base font-bold text-foreground">
                                    {master.price_min} <span className="text-xs font-normal text-muted-foreground">сомонӣ</span>
                                  </p>
                                </div>
                                <div className="flex gap-1.5">
                                  <Link to={`/masters/${master.id}`}>
                                    <Button size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs">
                                      Подробнее
                                    </Button>
                                  </Link>
                                  <Button size="sm" className="rounded-full h-8 px-3 text-xs"
                                    onClick={() => openBooking(master)}>
                                    Заказать
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                  {hasMore && (
                    <div className="flex justify-center mt-8">
                      <Button variant="outline" className="rounded-full px-8" onClick={() => setPage(p => p + 1)}>
                        Показать ещё ({filteredMasters.length - paginatedMasters.length} мастеров)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* Booking dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-md max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Заказать: {selectedMaster?.full_name}</DialogTitle>
          </DialogHeader>
          {bookingDone ? (
            <div className="flex flex-col items-center py-8 gap-3">
              <CheckCircle className="w-12 h-12 text-green-500" />
              <p className="font-medium text-foreground text-center">Заявка отправлена. Мастер скоро свяжется с вами.</p>
            </div>
          ) : (
            <form onSubmit={handleBook} className="space-y-4">
              <Input placeholder="Ваше имя" className="h-12 text-base" />
              <Input placeholder="Ваш телефон" value={bPhone} onChange={e => setBPhone(e.target.value)} required type="tel" className="h-12 text-base" />
              <Select value={bDistrict} onValueChange={setBDistrict}>
                <SelectTrigger className="h-12 text-base"><SelectValue placeholder="Район" /></SelectTrigger>
                <SelectContent>
                  {districts.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input placeholder="Адрес" value={bAddress} onChange={e => setBAddress(e.target.value)} required className="h-12 text-base" />
              <Input type="date" placeholder="Желаемая дата" value={bDate} onChange={e => setBDate(e.target.value)} className="h-12 text-base" />
              <Textarea placeholder="Опишите проблему..." value={bDesc} onChange={e => setBDesc(e.target.value)} className="text-base min-h-[80px]" />
              <Button type="submit" className="w-full rounded-full h-12 text-base" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Отправить заказ
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

// Lazy-loaded map component
function MastersMap({ masters, onBookMaster, gradients }: { masters: MasterListing[]; onBookMaster: (m: MasterListing) => void; gradients: string[] }) {
  const [MapComponent, setMapComponent] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    // Dynamically import leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });
    });

    import("react-leaflet").then((mod) => {
      const MapContainer = mod.MapContainer;
      const TileLayer = mod.TileLayer;
      const Marker = mod.Marker;
      const Popup = mod.Popup;

      const mastersWithCoords = masters.filter(m => m.latitude && m.longitude);

      const MapComp = () => (
        <div className="rounded-xl overflow-hidden border border-border mb-6" style={{ height: 400 }}>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
          <MapContainer
            center={[38.5598, 68.7738]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mastersWithCoords.map((master, i) => (
              <Marker key={master.id} position={[master.latitude!, master.longitude!]}>
                <Popup>
                  <div className="text-sm min-w-[180px]">
                    <p className="font-bold">{master.full_name}</p>
                    <div className="flex items-center gap-1 my-1">
                      <span className="text-yellow-500">★</span>
                      <span>{master.average_rating}</span>
                      <span className="text-muted-foreground">({master.total_reviews})</span>
                    </div>
                    <p className="text-muted-foreground">от {master.price_min} сом.</p>
                    <button
                      onClick={() => onBookMaster(master)}
                      className="mt-2 w-full bg-primary text-primary-foreground text-xs py-1.5 px-3 rounded-full font-medium hover:opacity-90"
                    >
                      Заказать мастера
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      );

      setMapComponent(() => MapComp);
    });
  }, [masters, onBookMaster]);

  if (!MapComponent) {
    return (
      <div className="rounded-xl border border-border mb-6 flex items-center justify-center bg-muted" style={{ height: 400 }}>
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <MapComponent />;
}
