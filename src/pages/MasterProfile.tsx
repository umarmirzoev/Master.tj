import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star, MapPin, Phone, MessageCircle,
  ArrowLeft, CheckCircle, Zap,
} from "lucide-react";

import MasterProfileCard from "@/components/master-profile/ProfileCard";
import MasterAbout from "@/components/master-profile/AboutSection";
import MasterServices from "@/components/master-profile/ServicesSection";
import MasterReviews from "@/components/master-profile/ReviewsSection";
import MasterPortfolio from "@/components/master-profile/PortfolioSection";
import MasterDistricts from "@/components/master-profile/DistrictsSection";
import MasterTrust from "@/components/master-profile/TrustBadges";
import SimilarMasters from "@/components/master-profile/SimilarMasters";
import MasterBookingBar from "@/components/master-profile/BookingBar";
import MasterBookingDialog from "@/components/master-profile/BookingDialog";

// Страница полного профиля мастера показывает его данные, услуги, отзывы, портфолио и форму бронирования.
export default function MasterProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [master, setMaster] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [similarMasters, setSimilarMasters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingOpen, setBookingOpen] = useState(false);

  // Загружаем профиль мастера, отзывы, портфолио и похожих специалистов для полной карточки.
  useEffect(() => {
    const load = async () => {
      if (!id) return;

      let masterData: any = null;
      const { data: listingData } = await supabase
        .from("master_listings").select("*").eq("id", id).maybeSingle();
      
      if (listingData) {
        masterData = listingData;
      } else {
        const { data: listingByUser } = await supabase
          .from("master_listings").select("*").eq("user_id", id).maybeSingle();
        if (listingByUser) {
          masterData = listingByUser;
        } else {
          const { data: profileData } = await supabase
            .from("profiles").select("*").eq("user_id", id).maybeSingle();
          masterData = profileData;
        }
      }

      if (!masterData) { setLoading(false); return; }
      setMaster(masterData);

      const masterId = masterData.user_id || masterData.id;
      const [reviewsRes, portfolioRes] = await Promise.all([
        supabase.from("reviews").select("*").eq("master_id", masterId).order("created_at", { ascending: false }),
        supabase.from("master_portfolio").select("*").eq("master_id", masterId).order("created_at", { ascending: false }),
      ]);

      setReviews(reviewsRes.data || []);
      setPortfolio(portfolioRes.data || []);

      if (masterData.service_categories?.length > 0) {
        const { data: similar } = await supabase
          .from("master_listings").select("*")
          .eq("is_active", true).neq("id", masterData.id)
          .contains("service_categories", [masterData.service_categories[0]])
          .order("average_rating", { ascending: false }).limit(4);
        setSimilarMasters(similar || []);
      }
      setLoading(false);
    };
    load();
  }, [id]);

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

  if (!master) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-lg text-muted-foreground">Мастер не найден</p>
          <Button onClick={() => navigate("/masters")} variant="outline" className="mt-4 rounded-full">
            <ArrowLeft className="w-4 h-4 mr-2" /> К списку мастеров
          </Button>
        </div>
      </div>
    );
  }

  const completedOrders = Math.round((master.total_reviews || 0) * 2.5 + (master.experience_years || 0) * 15);

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-5xl">
        <Button variant="ghost" className="mb-4 rounded-full text-muted-foreground hover:text-foreground" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Назад
        </Button>

        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-6">
          {/* Основная колонка раскрывает профиль мастера, его услуги, отзывы и географию работы. */}
          <div className="space-y-5">
            <MasterProfileCard
              master={master}
              reviews={reviews}
              completedOrders={completedOrders}
              onBook={() => setBookingOpen(true)}
            />

            <MasterTrust />
            <MasterAbout master={master} />
            <MasterServices master={master} />
            {portfolio.length > 0 && <MasterPortfolio portfolio={portfolio} />}
            <MasterReviews reviews={reviews} master={master} />
            <MasterDistricts master={master} />
          </div>

          {/* Боковая колонка на десктопе фиксирует цену, быстрые контакты и кнопку бронирования. */}
          <div className="hidden lg:block">
            <div className="sticky top-6 space-y-4">
              <Card className="overflow-hidden shadow-xl border-0 ring-1 ring-primary/10">
                <div className="h-1.5 bg-gradient-to-r from-primary to-emerald-400" />
                <CardContent className="p-6">
                  <div className="text-center mb-5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Нархи хизмат</p>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-sm text-muted-foreground">аз</span>
                      <span className="text-4xl font-bold text-foreground tracking-tight">{master.price_min || 50}</span>
                      <span className="text-lg text-muted-foreground">сомонӣ</span>
                    </div>
                  </div>

                  {/* Короткие показатели помогают быстро оценить мастера до чтения полного профиля. */}
                  <div className="space-y-3 mb-5">
                    {[
                      { icon: Star, label: "Рейтинг", value: master.average_rating || "5.0", iconClass: "fill-yellow-400 text-yellow-400" },
                      { icon: Zap, label: "Вақти ҷавоб", value: "~30 дақиқа", iconClass: "text-primary" },
                      { icon: CheckCircle, label: "Фармоишҳо", value: String(completedOrders), iconClass: "text-primary" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-2">
                          <item.icon className={`w-4 h-4 ${item.iconClass}`} /> {item.label}
                        </span>
                        <span className="text-sm font-bold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Индикатор показывает, что мастер условно доступен для быстрого обращения. */}
                  <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    Онлайн
                  </div>

                  <Button
                    size="lg"
                    className="w-full rounded-full h-13 text-base font-semibold shadow-lg bg-gradient-to-r from-primary to-emerald-500 hover:shadow-xl transition-all hover:scale-[1.02]"
                    onClick={() => setBookingOpen(true)}
                  >
                    Заказать мастера
                  </Button>

                  <div className="flex gap-2 mt-3">
                    {master.phone && (
                      <>
                        <Button size="sm" variant="outline" className="flex-1 rounded-full gap-1.5 h-10" asChild>
                          <a href={`tel:${master.phone}`}>
                            <Phone className="w-3.5 h-3.5" /> Звонок
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 rounded-full gap-1.5 h-10" asChild>
                          <a href={`https://wa.me/${master.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Небольшой блок социального доверия подталкивает пользователя не откладывать заказ. */}
              <Card className="border-0 shadow-md bg-gradient-to-br from-primary/5 to-emerald-500/5">
                <CardContent className="p-4 text-center">
                  <p className="text-sm font-medium text-foreground">
                    🔥 {Math.floor(Math.random() * 5 + 3)} нафар имрӯз фармоиш доданд
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Зудтар фармоиш диҳед!</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {similarMasters.length > 0 && <SimilarMasters masters={similarMasters} />}
      </div>

      <MasterBookingBar master={master} onBook={() => setBookingOpen(true)} />
      <MasterBookingDialog open={bookingOpen} onOpenChange={setBookingOpen} master={master} />

      {/* Дополнительный отступ нужен, чтобы мобильная панель бронирования не перекрывала контент. */}
      <div className="h-20 lg:hidden" />
      <Footer />
    </div>
  );
}
