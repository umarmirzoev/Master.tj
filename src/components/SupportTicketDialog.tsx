import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { HelpCircle, Loader2 } from "lucide-react";

const CATEGORIES = [
  { value: "master_issue", labelKey: "supportCatMaster" },
  { value: "order_issue", labelKey: "supportCatOrder" },
  { value: "product_issue", labelKey: "supportCatProduct" },
  { value: "refund", labelKey: "supportCatRefund" },
  { value: "other", labelKey: "supportCatOther" },
];

// Диалог поддержки позволяет пользователю отправить обращение в службу помощи.
export default function SupportTicketDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Создаём тикет поддержки только после проверки обязательных полей и авторизации.
  const handleSubmit = async () => {
    if (!user || !category || !subject || !message) {
      toast({ title: t("supportFillAll"), variant: "destructive" });
      return;
    }
    setSending(true);
    const { error } = await supabase.from("support_tickets").insert({
      user_id: user.id, category, subject, message,
    } as any);
    setSending(false);
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("supportSent"), description: t("supportSentDesc") });
      setCategory(""); setSubject(""); setMessage("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-primary" /> {t("supportTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger><SelectValue placeholder={t("supportSelectCategory")} /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder={t("supportSubject")} value={subject} onChange={e => setSubject(e.target.value)} />
          <Textarea placeholder={t("supportMessage")} value={message} onChange={e => setMessage(e.target.value)} rows={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={handleSubmit} disabled={sending}>
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {t("supportSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
