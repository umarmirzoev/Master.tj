import { motion } from "framer-motion";
import { Shield, Zap, ThumbsUp, Award } from "lucide-react";

const badges = [
  { icon: Shield, label: "Проверенный мастер", sub: "Ҳуҷҷатҳо тасдиқ шудаанд", bg: "bg-primary/5 border-primary/15" },
  { icon: Award, label: "Документы верифицированы", sub: "Паспорт ва иҷозатнома", bg: "bg-amber-500/5 border-amber-500/15" },
  { icon: Zap, label: "Быстрый выезд", sub: "Дар рӯзи муроҷиат", bg: "bg-blue-500/5 border-blue-500/15" },
  { icon: ThumbsUp, label: "Гарантия качества", sub: "Кафолати хизматрасонӣ", bg: "bg-emerald-500/5 border-emerald-500/15" },
];

const iconColors = ["text-primary", "text-amber-500", "text-blue-500", "text-emerald-500"];

// Бейджи доверия коротко объясняют, почему этому мастеру можно доверять.
export default function MasterTrust() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {badges.map((b, i) => (
        <motion.div
          key={b.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 + i * 0.05 }}
          className={`flex flex-col items-center text-center gap-2 p-4 rounded-2xl border ${b.bg} hover:shadow-md transition-shadow`}
        >
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColors[i]} bg-card shadow-sm`}>
            <b.icon className="w-5 h-5" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{b.label}</span>
          <span className="text-[10px] sm:text-xs text-muted-foreground leading-tight">{b.sub}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}
