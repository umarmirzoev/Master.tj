import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MapPin, Clock, Phone, MessageCircle, CheckCircle, Briefcase, TrendingUp } from "lucide-react";

interface Props {
  master: any;
  reviews: any[];
  completedOrders: number;
  onBook: () => void;
}

export default function MasterProfileCard({ master, reviews, completedOrders, onBook }: Props) {
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
    : master.average_rating || "5.0";

  const initials = master.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2) || "М";
  const totalReviews = reviews.length || master.total_reviews || 0;
  const isTopRated = Number(avgRating) >= 4.5;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="overflow-hidden border-0 shadow-xl">
        {/* Gradient header band */}
        <div className="h-28 sm:h-32 bg-gradient-to-br from-primary via-primary to-emerald-400 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
          {isTopRated && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute top-4 right-4"
            >
              <Badge className="bg-card/95 text-foreground border-0 shadow-lg px-3 py-1.5 text-xs font-semibold backdrop-blur-sm">
                <TrendingUp className="w-3.5 h-3.5 mr-1 text-primary" /> ТОП мастер
              </Badge>
            </motion.div>
          )}
        </div>

        <CardContent className="p-5 sm:p-8 -mt-16 sm:-mt-20 relative">
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Avatar - overlapping the gradient */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
              className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-gradient-to-br from-primary to-emerald-400 flex items-center justify-center text-primary-foreground text-4xl sm:text-5xl font-bold shadow-2xl shrink-0 ring-4 ring-card"
            >
              {initials}
            </motion.div>

            <div className="flex-1 pt-2 sm:pt-6">
              <div className="flex items-start gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">{master.full_name}</h1>
                <Badge className="bg-primary/10 text-primary border-primary/20 mt-1">
                  <CheckCircle className="w-3 h-3 mr-1" /> Проверен
                </Badge>
              </div>

              {master.service_categories?.length > 0 && (
                <p className="text-base text-muted-foreground mt-1 font-medium">{master.service_categories[0]}</p>
              )}

              {/* Rating - prominent */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-accent px-3 py-1.5 rounded-full">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className={`w-4 h-4 ${i <= Math.round(Number(avgRating)) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                  <span className="text-base font-bold">{avgRating}</span>
                  <span className="text-muted-foreground text-sm">({totalReviews})</span>
                </div>
              </div>

              {/* Stats chips */}
              <div className="flex flex-wrap gap-2 mt-4">
                {master.experience_years > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium text-foreground">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> {master.experience_years} сол таҷриба
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium text-foreground">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" /> {completedOrders} фармоишҳо
                </div>
                {master.working_districts?.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-sm font-medium text-foreground">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {master.working_districts[0]}
                  </div>
                )}
              </div>

              {/* Price highlight */}
              <div className="mt-5 inline-flex items-baseline gap-1 px-5 py-3 rounded-2xl bg-primary/5 border border-primary/15">
                <span className="text-sm text-muted-foreground">аз</span>
                <span className="text-3xl font-bold text-foreground">{master.price_min || 50}</span>
                <span className="text-base text-muted-foreground">сомонӣ</span>
              </div>
            </div>
          </div>

          {/* Categories */}
          {master.service_categories?.length > 1 && (
            <div className="flex flex-wrap gap-2 mt-6">
              {master.service_categories.map((cat: string) => (
                <Badge key={cat} variant="secondary" className="text-sm px-3 py-1.5">{cat}</Badge>
              ))}
            </div>
          )}

          {/* Urgency / availability nudge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-5 flex items-center gap-2 text-sm"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
            </span>
            <span className="text-muted-foreground">Онлайн — одатан дар 30 дақиқа ҷавоб медиҳад</span>
          </motion.div>

          {/* Action buttons (mobile/tablet) */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:hidden">
            <Button
              size="lg"
              className="flex-1 rounded-full h-13 text-base font-semibold shadow-lg bg-gradient-to-r from-primary to-emerald-500 hover:shadow-xl transition-shadow"
              onClick={onBook}
            >
              Заказать мастера
            </Button>
            {master.phone && (
              <div className="flex gap-2">
                <Button size="lg" variant="outline" className="flex-1 rounded-full h-12 gap-2" asChild>
                  <a href={`tel:${master.phone}`}><Phone className="w-4 h-4" /> Позвонить</a>
                </Button>
                <Button size="lg" variant="outline" className="flex-1 rounded-full h-12 gap-2" asChild>
                  <a href={`https://wa.me/${master.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
