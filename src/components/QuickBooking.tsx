import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Zap, Phone, MapPin, CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuickBookingProps { open: boolean; onOpenChange: (open: boolean) => void; }

// Компонент быстрого заказа позволяет срочно отправить проблему без выбора конкретной услуги.
export default function QuickBooking({ open, onOpenChange }: QuickBookingProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Загружаем категории, чтобы пользователь при желании мог уточнить направление работ.
  useEffect(() => {
    supabase.from("service_categories").select("id, name_ru").order("sort_order").then(({ data }) => { if (data) setCategories(data); });
  }, []);

  // Быстрый заказ создаёт срочную заявку и уведомляет администраторов платформы.
  const handleSubmit = async () => {
    if (!user) {
      toast({ title: t("qbLoginRequired"), description: t("qbLoginRequiredDesc"), variant: "destructive" });
      navigate("/auth"); return;
    }
    if (!description.trim() || !phone.trim() || !address.trim()) {
      toast({ title: t("qbFillAllFields"), variant: "destructive" }); return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("orders").insert({ client_id: user.id, description: description.trim(), phone: phone.trim(), address: address.trim(), category_id: categoryId || null, status: "new", budget: 0 });
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      const { data: admins } = await supabase.from("user_roles").select("user_id").in("role", ["admin", "super_admin"]);
      if (admins) {
        await Promise.all(admins.map((a) => supabase.from("notifications").insert({ user_id: a.user_id, title: "⚡ " + t("qbUrgentOrder"), message: description.slice(0, 60), type: "urgent_order" })));
      }
      toast({ title: "✅ " + t("qbOrderCreated"), description: t("qbOrderCreatedDesc") });
      setTimeout(() => { setSuccess(false); setDescription(""); setPhone(""); setAddress(""); setCategoryId(""); onOpenChange(false); }, 2000);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-amber-600" />
            </div>
            {t("qbUrgentOrder")}
          </DialogTitle>
        </DialogHeader>
        {/* В модалке переключаемся между формой заполнения и экраном успешной отправки. */}
        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <p className="font-semibold text-foreground">{t("qbOrderSent")}</p>
            <p className="text-sm text-muted-foreground">{t("qbWillFindMaster")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("qbDescribeProblem")}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("qbWhatHappened")}</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("qbWhatHappenedPlaceholder")} className="min-h-[80px] rounded-xl" maxLength={500} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("qbCategoryOptional")}</label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("qbAutoDetect")} /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name_ru}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("qbPhone")}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+992 900 000 000" className="pl-9 rounded-xl" maxLength={20} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t("qbAddress")}</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("qbAddressPlaceholder")} className="pl-9 rounded-xl" maxLength={200} />
                </div>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={submitting || !description.trim() || !phone.trim() || !address.trim()} className="w-full rounded-xl gap-2 h-11 bg-amber-500 hover:bg-amber-600 text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {submitting ? t("qbSending") : t("qbSendUrgent")}
            </Button>
            <p className="text-[11px] text-center text-muted-foreground">{t("qbAvgResponse")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
