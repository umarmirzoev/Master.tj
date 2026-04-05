import { Button } from "@/components/ui/button";
import { Star, Phone, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  master: any;
  onBook: () => void;
}

// Нижняя мобильная панель постоянно показывает цену, рейтинг и быстрые действия по мастеру.
export default function MasterBookingBar({ master, onBook }: Props) {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card/95 backdrop-blur-lg border-t border-border shadow-[0_-8px_30px_rgba(0,0,0,0.12)] safe-area-bottom"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-muted-foreground">аз</span>
            <span className="text-xl font-bold text-foreground">{master.price_min || 50}</span>
            <span className="text-sm text-muted-foreground">сомонӣ</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-foreground">{master.average_rating || "5.0"}</span>
            <span>· {master.total_reviews || 0} отзывов</span>
          </div>
        </div>

        {master.phone && (
          <a
            href={`https://wa.me/${master.phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-accent transition-colors shrink-0"
          >
            <MessageCircle className="w-4.5 h-4.5 text-foreground" />
          </a>
        )}

        <Button
          size="lg"
          className="rounded-full h-11 px-7 font-semibold bg-gradient-to-r from-primary to-emerald-500 shadow-lg text-base"
          onClick={onBook}
        >
          Заказать
        </Button>
      </div>
    </motion.div>
  );
}
