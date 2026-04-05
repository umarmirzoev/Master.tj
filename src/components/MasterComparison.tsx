import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Clock, CheckCircle, Award, X, Scale } from "lucide-react";

interface Master {
  id: string;
  full_name: string;
  average_rating: number;
  total_reviews: number;
  experience_years: number;
  service_categories: string[];
  working_districts: string[];
  price_min: number;
  price_max: number;
  completed_orders: number;
  response_time_avg: number;
  is_top_master: boolean;
}

// Хук хранит выбранных мастеров для сравнения и ограничивает список тремя позициями.
export function useComparison() {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const clearCompare = () => setCompareIds([]);
  const isComparing = (id: string) => compareIds.includes(id);

  return { compareIds, toggleCompare, clearCompare, isComparing };
}

// Нижняя панель сравнения показывает число выбранных мастеров и открывает сравнение.
export function CompareBar({ compareIds, onOpen, onClear }: { compareIds: string[]; onOpen: () => void; onClear: () => void }) {
  const { t } = useLanguage();
  if (compareIds.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-card border-2 border-primary shadow-2xl rounded-2xl px-6 py-3 flex items-center gap-4">
      <Scale className="w-5 h-5 text-primary" />
      <span className="text-sm font-medium">{t("compareSelected")}: {compareIds.length}/3</span>
      <Button size="sm" onClick={onOpen} disabled={compareIds.length < 2} className="rounded-full">
        {t("compareMasters")}
      </Button>
      <Button size="sm" variant="ghost" onClick={onClear} className="rounded-full h-8 w-8 p-0">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

// Диалог сравнения загружает выбранных мастеров и раскладывает их характеристики по таблице.
export default function MasterComparisonDialog({ open, onOpenChange, masterIds }: { open: boolean; onOpenChange: (v: boolean) => void; masterIds: string[] }) {
  const { t } = useLanguage();
  const [masters, setMasters] = useState<Master[]>([]);

  // При открытии загружаем данные только для тех мастеров, которых пользователь выбрал к сравнению.
  useEffect(() => {
    if (!open || masterIds.length === 0) return;
    supabase
      .from("master_listings")
      .select("id, full_name, average_rating, total_reviews, experience_years, service_categories, working_districts, price_min, price_max, completed_orders, response_time_avg, is_top_master")
      .in("id", masterIds)
      .then(({ data }) => setMasters((data as any[]) || []));
  }, [open, masterIds]);

  const gradients = ["from-primary to-emerald-400", "from-blue-500 to-cyan-400", "from-violet-500 to-purple-400"];

  const rows: { label: string; render: (m: Master) => React.ReactNode }[] = [
    { label: t("compareRating"), render: m => (
      <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
        <span className="font-bold">{m.average_rating}</span>
      </div>
    )},
    { label: t("compareReviews"), render: m => <span className="font-semibold">{m.total_reviews}</span> },
    { label: t("compareExperience"), render: m => <span>{m.experience_years} {t("yearsShort")}</span> },
    { label: t("compareCompleted"), render: m => <span className="font-semibold">{m.completed_orders}</span> },
    { label: t("compareDistricts"), render: m => (
      <div className="flex flex-wrap gap-1">{m.working_districts?.map(d => <Badge key={d} variant="secondary" className="text-[10px]">{d}</Badge>)}</div>
    )},
    { label: t("compareCategories"), render: m => (
      <div className="flex flex-wrap gap-1">{m.service_categories?.map(c => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}</div>
    )},
    { label: t("comparePrice"), render: m => <span className="font-bold">{m.price_min}–{m.price_max} сом.</span> },
    { label: t("compareResponse"), render: m => <span>{m.response_time_avg ? `${m.response_time_avg} мин` : "—"}</span> },
    { label: t("compareTopMaster"), render: m => m.is_top_master ? <Badge className="bg-amber-100 text-amber-800"><Award className="w-3 h-3 mr-1" />Топ</Badge> : <span className="text-muted-foreground">—</span> },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" /> {t("compareMasters")}
          </DialogTitle>
        </DialogHeader>

        {masters.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-3 text-left text-sm font-medium text-muted-foreground w-40"></th>
                  {masters.map((m, i) => {
                    const initials = m.full_name.split(" ").map(w => w[0]).join("").slice(0, 2);
                    return (
                      <th key={m.id} className="p-3 text-center">
                        <div className={`w-14 h-14 mx-auto rounded-xl bg-gradient-to-br ${gradients[i]} flex items-center justify-center text-white font-bold text-lg mb-2`}>
                          {initials}
                        </div>
                        <p className="font-bold text-foreground text-sm">{m.full_name}</p>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-muted/30" : ""}>
                    <td className="p-3 text-sm font-medium text-muted-foreground">{row.label}</td>
                    {masters.map(m => (
                      <td key={m.id} className="p-3 text-center text-sm">{row.render(m)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
