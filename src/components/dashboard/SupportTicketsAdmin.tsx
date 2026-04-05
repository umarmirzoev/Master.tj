import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, MessageSquare, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  open: { label: "Открыт", color: "bg-blue-100 text-blue-800", icon: Clock },
  in_progress: { label: "В работе", color: "bg-yellow-100 text-yellow-800", icon: MessageSquare },
  resolved: { label: "Решён", color: "bg-green-100 text-green-800", icon: CheckCircle },
  closed: { label: "Закрыт", color: "bg-gray-100 text-gray-800", icon: XCircle },
};

const categoryLabels: Record<string, string> = {
  master_issue: "Проблема с мастером",
  order_issue: "Проблема с заказом",
  product_issue: "Проблема с товаром",
  refund: "Возврат средств",
  other: "Другое",
};

interface Ticket {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  admin_response: string | null;
  created_at: string;
}

// Раздел тикетов поддержки помогает администратору обрабатывать обращения пользователей.
export default function SupportTicketsAdmin() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [detailTicket, setDetailTicket] = useState<Ticket | null>(null);
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const loadTickets = async () => {
    const { data } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
    setTickets((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadTickets(); }, []);

  const filtered = filter === "all" ? tickets : tickets.filter(t => t.status === filter);
  const openCount = tickets.filter(t => t.status === "open").length;

  const updateTicket = async (id: string, status: string, adminResponse?: string) => {
    setSaving(true);
    const update: any = { status, updated_at: new Date().toISOString() };
    if (adminResponse) update.admin_response = adminResponse;
    await supabase.from("support_tickets").update(update).eq("id", id);

    // Notify user
    const ticket = tickets.find(t => t.id === id);
    if (ticket) {
      await supabase.from("notifications").insert({
        user_id: ticket.user_id,
        title: status === "resolved" ? t("supportResolved") : t("supportUpdated"),
        message: adminResponse || `Статус обращения изменён: ${statusConfig[status]?.label}`,
        type: "support",
        related_id: id,
      });
    }

    setSaving(false);
    toast({ title: t("supportStatusUpdated") });
    setDetailTicket(null);
    setResponse("");
    loadTickets();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" /> {t("supportTickets")}
          {openCount > 0 && <Badge variant="destructive" className="ml-1">{openCount}</Badge>}
        </h3>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="open">Открытые</SelectItem>
            <SelectItem value="in_progress">В работе</SelectItem>
            <SelectItem value="resolved">Решённые</SelectItem>
            <SelectItem value="closed">Закрытые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t("supportNoTickets")}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => {
            const cfg = statusConfig[ticket.status] || statusConfig.open;
            return (
              <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => { setDetailTicket(ticket); setResponse(ticket.admin_response || ""); }}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <cfg.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">{ticket.subject}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{categoryLabels[ticket.category] || ticket.category}</span>
                      <span>•</span>
                      <span>{new Date(ticket.created_at).toLocaleDateString("ru-RU")}</span>
                    </div>
                  </div>
                  <Badge className={cfg.color}>{cfg.label}</Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!detailTicket} onOpenChange={v => !v && setDetailTicket(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailTicket?.subject}</DialogTitle>
          </DialogHeader>
          {detailTicket && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={statusConfig[detailTicket.status]?.color}>{statusConfig[detailTicket.status]?.label}</Badge>
                <Badge variant="outline">{categoryLabels[detailTicket.category]}</Badge>
              </div>
              <div className="bg-muted/50 rounded-xl p-4">
                <p className="text-sm text-foreground whitespace-pre-wrap">{detailTicket.message}</p>
              </div>
              <Textarea placeholder={t("supportAdminResponse")} value={response} onChange={e => setResponse(e.target.value)} rows={3} />
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => updateTicket(detailTicket.id, "in_progress")} disabled={saving}>В работу</Button>
                <Button size="sm" onClick={() => updateTicket(detailTicket.id, "resolved", response)} disabled={saving || !response}>
                  {saving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />} Решить
                </Button>
                <Button size="sm" variant="secondary" onClick={() => updateTicket(detailTicket.id, "closed")} disabled={saving}>Закрыть</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
