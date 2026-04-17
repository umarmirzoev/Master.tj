import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string | null;
  initialServiceName?: string;
  categoryId?: string;
  serviceId?: string;
}

// Это универсальное модальное окно создаёт заявку клиента на вызов мастера.
export default function OrderModal({ isOpen, onClose, category, initialServiceName, categoryId, serviceId }: OrderModalProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  // При каждом открытии модалки сбрасываем промежуточные состояния отправки.
  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  // После проверки авторизации отправляем заказ в таблицу orders.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({ title: t("login"), description: "Пожалуйста, войдите в аккаунт", variant: "destructive" });
      navigate("/auth");
      onClose();
      return;
    }

    setSubmitting(true);
    const { data: createdOrders, error } = await supabase.from("orders").insert({
      client_id: user.id,
      category_id: categoryId || null,
      service_id: serviceId || null,
      description: `${initialServiceName ? initialServiceName + ". " : ""}${comment}`.trim(),
      address: `${district ? t(district) + ", " : ""}${address}`,
      phone,
      preferred_time: preferredTime || null,
      status: "new",
    }).select("id");

    setSubmitting(false);

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
      return;
    }

    const createdOrder = createdOrders?.[0];
    if (createdOrder) {
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "super_admin"]);

      if (admins?.length) {
        await Promise.all(
          admins.map((admin) =>
            supabase.from("notifications").insert({
              user_id: admin.user_id,
              title: "Новый заказ",
              message: `${initialServiceName || "Новая заявка"} • ${district ? `${t(district)}, ` : ""}${address}`,
              type: "order_created",
              related_id: createdOrder.id,
            })
          )
        );
      }
    }

    setSubmitted(true);
    toast({ title: t("orderModalSuccess") });

    setTimeout(() => {
      setSubmitted(false);
      setName("");
      setPhone("");
      setComment("");
      setDistrict("");
      setAddress("");
      setPreferredTime("");
      onClose();
    }, 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[100dvh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{t("orderModalTitle")}</DialogTitle>
          <DialogDescription>
            {initialServiceName ? initialServiceName : t("orderModalDesc")}
          </DialogDescription>
        </DialogHeader>

        {/* После отправки показываем состояние успеха, иначе форму создания заявки. */}
        {submitted ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="text-center font-medium text-foreground">{t("orderModalSuccess")}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <Input placeholder={t("formName")} value={name} onChange={(e) => setName(e.target.value)} required className="h-12 text-base" />
            <Input placeholder={t("formPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} required type="tel" className="h-12 text-base" />
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder={t("formDistrict")} />
              </SelectTrigger>
              <SelectContent>
                {["districtSino", "districtFirdausi", "districtShomansur", "districtIsmoili"].map((d) => (
                  <SelectItem key={d} value={d}>{t(d)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input placeholder="Адрес / Address" value={address} onChange={(e) => setAddress(e.target.value)} required className="h-12 text-base" />
            <Input placeholder="Удобное время / Preferred time" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} className="h-12 text-base" />
            <Textarea placeholder={t("formComment")} value={comment} onChange={(e) => setComment(e.target.value)} className="text-base min-h-[80px]" />
            <Button type="submit" className="w-full rounded-full h-12 text-base" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t("orderModalSubmit")}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
