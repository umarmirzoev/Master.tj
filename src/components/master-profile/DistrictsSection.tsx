import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

interface Props {
  master: any;
}

// Секция районов показывает, где мастер готов выезжать на заказы.
export default function MasterDistricts({ master }: Props) {
  const districts = master.working_districts || [];
  if (districts.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-primary" /> Ноҳияҳои корӣ
          </h2>
          <div className="flex flex-wrap gap-2">
            {districts.map((d: string) => (
              <Badge key={d} variant="secondary" className="text-sm px-4 py-2 rounded-full">
                <MapPin className="w-3 h-3 mr-1.5" /> {d}
              </Badge>
            ))}
          </div>

          {/* Map */}
          {master.latitude && master.longitude && (
            <div className="mt-4 rounded-xl overflow-hidden border border-border/50">
              <iframe
                title="Местоположение"
                width="100%"
                height="200"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${master.longitude - 0.02},${master.latitude - 0.015},${master.longitude + 0.02},${master.latitude + 0.015}&layer=mapnik&marker=${master.latitude},${master.longitude}`}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
