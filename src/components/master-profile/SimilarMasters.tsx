import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Clock, MapPin } from "lucide-react";

interface Props {
  masters: any[];
}

const gradients = [
  "from-primary to-emerald-400",
  "from-blue-500 to-cyan-400",
  "from-violet-500 to-purple-400",
  "from-amber-500 to-orange-400",
];

export default function SimilarMasters({ masters }: Props) {
  // Блок похожих мастеров помогает быстро сравнить альтернативных специалистов.
  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8">
      <h2 className="text-xl font-bold text-foreground mb-4">Похожие мастера</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {masters.slice(0, 4).map((m, i) => {
          const initials = m.full_name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2);
          return (
            <Link key={m.id} to={`/masters/${m.id}`}>
              <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden h-full">
                <div className={`h-1.5 bg-gradient-to-r ${gradients[i % gradients.length]}`} />
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate text-sm">{m.full_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{m.average_rating}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{m.experience_years} сол</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-primary">аз {m.price_min || 50} сомонӣ</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
