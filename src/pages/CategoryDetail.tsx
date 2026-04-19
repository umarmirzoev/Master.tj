import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Wrench, Users, ShoppingCart } from "lucide-react";
import OrderModal from "@/components/OrderModal";

interface ServiceCategory {
  id: string;
  name_ru: string;
  name_tj: string;
  name_en: string;
  icon: string;
  color: string;
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

// Страница категории показывает все услуги внутри выбранной категории.
export default function CategoryDetail() {
  const { id } = useParams<{ id: string }>();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<{id: string, name: string} | null>(null);

  // Загружаем данные категории и список услуг, относящихся к ней.
  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from("service_categories").select("*").eq("id", id).maybeSingle(),
      supabase.from("services").select("*").eq("category_id", id).order("sort_order"),
    ]).then(([catRes, svcRes]) => {
      setCategory(catRes.data as ServiceCategory | null);
      setServices((svcRes.data as Service[]) || []);
      setLoading(false);
    });
  }, [id]);

  const getName = (item: { name_ru: string; name_tj: string; name_en: string }) => {
    if (language === "tj") return item.name_tj || item.name_ru;
    if (language === "en") return item.name_en || item.name_ru;
    return item.name_ru;
  };

  const priceLabel = language === "en" ? "somoni" : "сомонӣ";

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

  if (!category) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-lg text-muted-foreground">Категория не найдена</p>
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
        <div className="container px-4 mx-auto max-w-4xl">
          {/* Back */}
          <Button variant="ghost" className="mb-4 rounded-full" onClick={() => navigate("/categories")}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Все категории
          </Button>

          {/* Category header */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="flex items-center gap-4 mb-2">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${category.color} flex items-center justify-center shadow-lg`}>
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{getName(category)}</h1>
                <p className="text-muted-foreground">{services.length} {language === "en" ? "services" : "услуг"}</p>
              </div>
            </div>
          </motion.div>

          {/* Services list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                className="relative group"
              >
                <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 border-border/50">
                  <CardContent className="p-4 sm:p-5">
                    <Link to={`/service/${service.id}`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {getName(service)}
                          </h3>
                          {service.note && (
                            <p className="text-xs text-muted-foreground mt-1">{service.note}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {service.price_min}–{service.price_max} {priceLabel}
                            </Badge>
                            <span className="text-xs text-muted-foreground">/{service.unit}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button size="sm" variant="ghost" className="rounded-full h-9 w-9 p-0 group-hover:bg-primary/10">
                            <ArrowRight className="w-4 h-4 group-hover:text-primary transition-colors" />
                          </Button>
                        </div>
                      </div>
                    </Link>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <Link to={`/service/${service.id}`} className="hover:text-primary">Посмотреть мастеров</Link>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full h-8 px-3 text-xs gap-1.5 hover:bg-primary hover:text-white border-primary/30 text-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          setSelectedService({ id: service.id, name: getName(service) });
                          setOrderModalOpen(true);
                        }}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Заказать
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
      {selectedService && (
        <OrderModal 
          isOpen={orderModalOpen}
          onClose={() => setOrderModalOpen(false)}
          categoryId={id}
          serviceId={selectedService.id}
          initialServiceName={selectedService.name}
          category={getName(category)}
        />
      )}
    </div>
  );
}
