import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Timer } from "lucide-react";

interface Props {
  endDate: string;
  className?: string;
}

// Таймер обратного отсчёта показывает оставшееся время до конца акции или события.
export default function CountdownTimer({ endDate, className = "" }: Props) {
  const { t } = useLanguage();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const calc = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  if (expired) return null;

  const blocks = [
    { value: timeLeft.days, label: t("promoTimerDays") },
    { value: timeLeft.hours, label: t("promoTimerHours") },
    { value: timeLeft.minutes, label: t("promoTimerMinutes") },
    { value: timeLeft.seconds, label: t("promoTimerSeconds") },
  ];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-1.5 text-destructive">
        <Timer className="w-4 h-4" />
        <span className="text-sm font-medium">{t("promoEndsIn")}</span>
      </div>
      <div className="flex gap-1.5">
        {blocks.map((b, i) => (
          <div key={i} className="flex flex-col items-center">
            <span className="bg-destructive/10 text-destructive font-bold text-sm px-2 py-1 rounded-lg min-w-[36px] text-center">
              {String(b.value).padStart(2, "0")}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
