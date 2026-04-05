import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, UserPlus, FileText, ClipboardList, Star, Package, CheckCircle, XCircle, ShieldCheck } from "lucide-react";

const actionConfig: Record<string, { icon: any; color: string; label: string }> = {
  user_registered: { icon: UserPlus, color: "bg-blue-100 text-blue-700", label: "Регистрация" },
  master_application_submitted: { icon: FileText, color: "bg-amber-100 text-amber-700", label: "Заявка мастера" },
  master_approved: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Одобрение" },
  master_rejected: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Отклонение" },
  order_created: { icon: ClipboardList, color: "bg-indigo-100 text-indigo-700", label: "Новый заказ" },
  order_completed: { icon: CheckCircle, color: "bg-emerald-100 text-emerald-700", label: "Заказ завершён" },
  review_submitted: { icon: Star, color: "bg-yellow-100 text-yellow-700", label: "Отзыв" },
  product_added: { icon: Package, color: "bg-purple-100 text-purple-700", label: "Новый товар" },
};

interface LogEntry {
  id: string;
  action: string;
  actor_id: string | null;
  actor_name: string;
  entity_type: string;
  entity_id: string | null;
  details: string;
  created_at: string;
}

// Компонент журнала активности показывает административные события и действия внутри платформы.
export default function ActivityLogSection() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(200)
      .then(({ data }) => { setLogs((data as any[]) || []); setLoading(false); });
  }, []);

  const filtered = filter === "all" ? logs : logs.filter(l => l.action === filter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" /> {t("activityLog")}
        </h3>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все события</SelectItem>
            {Object.entries(actionConfig).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t("activityEmpty")}</div>
      ) : (
        <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
          {filtered.map(log => {
            const cfg = actionConfig[log.action] || { icon: Activity, color: "bg-gray-100 text-gray-700", label: log.action };
            const Icon = cfg.icon;
            return (
              <Card key={log.id} className="border-0 shadow-none bg-transparent">
                <CardContent className="p-3 flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg ${cfg.color} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{log.details}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      {log.actor_name && <span className="font-medium">{log.actor_name}</span>}
                      <span>{new Date(log.created_at).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">{cfg.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
