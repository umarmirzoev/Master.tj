import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, Banknote, Smartphone, CheckCircle, XCircle,
  Loader2, FileText, Download, Clock, AlertTriangle, Shield,
} from "lucide-react";

// В этом файле собраны общие компоненты и справочники для оплаты, статусов и чеков.
// ── Status helpers ──────────────────────────────────
export const paymentStatusColors: Record<string, string> = {
  unpaid: "bg-muted text-muted-foreground",
  pending: "bg-amber-100 text-amber-800",
  partially_paid: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
  refunded: "bg-violet-100 text-violet-800",
  failed: "bg-red-100 text-red-800",
};

export const paymentStatusLabels: Record<string, string> = {
  unpaid: "Не оплачен",
  pending: "Ожидает оплаты",
  partially_paid: "Частично оплачен",
  paid: "Оплачен",
  refunded: "Возврат",
  failed: "Ошибка оплаты",
};

export const paymentStatusIcons: Record<string, typeof CheckCircle> = {
  unpaid: Clock,
  pending: Clock,
  partially_paid: AlertTriangle,
  paid: CheckCircle,
  refunded: AlertTriangle,
  failed: XCircle,
};

// ── Price breakdown ─────────────────────────────────
interface PriceBreakdownProps {
  servicePrice: number;
  materialsCost: number;
  urgencySurcharge: number;
  totalAmount: number;
  compact?: boolean;
}

export function PriceBreakdown({ servicePrice, materialsCost, urgencySurcharge, totalAmount, compact }: PriceBreakdownProps) {
  const items = [
    { label: "Услуга", value: servicePrice },
    ...(materialsCost > 0 ? [{ label: "Материалы", value: materialsCost }] : []),
    ...(urgencySurcharge > 0 ? [{ label: "Срочный выезд", value: urgencySurcharge }] : []),
  ];

  if (compact) {
    return (
      <div className="text-sm space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-muted-foreground">
            <span>{item.label}</span>
            <span>{item.value.toLocaleString()} сомонӣ</span>
          </div>
        ))}
        <Separator className="my-1" />
        <div className="flex justify-between font-bold text-foreground">
          <span>Итого</span>
          <span>{totalAmount.toLocaleString()} сомонӣ</span>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-border/60">
      <CardContent className="p-4 space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium">{item.value.toLocaleString()} сомонӣ</span>
          </div>
        ))}
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Итого</span>
          <span className="text-primary">{totalAmount.toLocaleString()} сомонӣ</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Payment badge ───────────────────────────────────
export function PaymentStatusBadge({ status }: { status: string }) {
  const Icon = paymentStatusIcons[status] || Clock;
  return (
    <Badge className={`${paymentStatusColors[status] || paymentStatusColors.unpaid} gap-1`}>
      <Icon className="w-3 h-3" />
      {paymentStatusLabels[status] || status}
    </Badge>
  );
}

// ── Payment dialog ──────────────────────────────────
interface PaymentDialogProps {
  order: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete: () => void;
}

export function PaymentDialog({ order, open, onOpenChange, onPaymentComplete }: PaymentDialogProps) {
  const { toast } = useToast();
  const [method, setMethod] = useState("card");
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const total = order?.total_amount || order?.budget || 0;
  const servicePrice = order?.service_price || total;
  const materialsCost = order?.materials_cost || 0;
  const urgencySurcharge = order?.urgency_surcharge || 0;

  const handlePay = async () => {
    if (!order) return;
    setProcessing(true);

    // Simulate payment processing
    await new Promise((r) => setTimeout(r, 2000));

    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_method: method,
        paid_at: new Date().toISOString(),
        total_amount: total,
        service_price: servicePrice,
        materials_cost: materialsCost,
        urgency_surcharge: urgencySurcharge,
        platform_commission: Math.round(total * 0.2),
        master_payout: Math.round(total * 0.8),
      } as any)
      .eq("id", order.id);

    if (error) {
      toast({ title: "Ошибка оплаты", description: error.message, variant: "destructive" });
      // Mark as failed
      await supabase.from("orders").update({ payment_status: "failed" } as any).eq("id", order.id);
    } else {
      setSuccess(true);
      toast({ title: "✅ Оплата прошла успешно!" });

      // Notify master
      if (order.master_id) {
        await supabase.from("notifications").insert({
          user_id: order.master_id,
          title: "💰 Оплата получена",
          message: `Заказ оплачен клиентом: ${total} сомонӣ`,
          type: "payment_received",
          related_id: order.id,
        });
      }

      // Notify admins
      const { data: admins } = await supabase.from("user_roles").select("user_id").in("role", ["admin", "super_admin"]);
      if (admins) {
        await Promise.all(
          admins.map((a) =>
            supabase.from("notifications").insert({
              user_id: a.user_id,
              title: "Оплата заказа",
              message: `Заказ #${order.id.slice(0, 8)} оплачен: ${total} сомонӣ`,
              type: "payment_completed",
              related_id: order.id,
            })
          )
        );
      }

      onPaymentComplete();
    }
    setProcessing(false);
  };

  const handleClose = () => {
    setSuccess(false);
    setProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-primary" />
            </div>
            Оплата заказа
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Оплата прошла успешно!</p>
              <p className="text-sm text-muted-foreground mt-1">Спасибо за оплату</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-4 text-left">
              <PriceBreakdown
                servicePrice={servicePrice}
                materialsCost={materialsCost}
                urgencySurcharge={urgencySurcharge}
                totalAmount={total}
                compact
              />
            </div>
            <Button onClick={handleClose} className="rounded-full px-8">Готово</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Price breakdown */}
            <PriceBreakdown
              servicePrice={servicePrice}
              materialsCost={materialsCost}
              urgencySurcharge={urgencySurcharge}
              totalAmount={total}
            />

            {/* Payment method */}
            <div>
              <p className="text-sm font-semibold mb-3">Способ оплаты</p>
              <RadioGroup value={method} onValueChange={setMethod} className="space-y-2">
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${method === "card" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card" className="flex items-center gap-2 cursor-pointer flex-1">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Банковская карта</p>
                      <p className="text-[11px] text-muted-foreground">Visa, Mastercard, Корти Милли</p>
                    </div>
                  </Label>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${method === "mobile" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="mobile" id="mobile" />
                  <Label htmlFor="mobile" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Мобильный платёж</p>
                      <p className="text-[11px] text-muted-foreground">Alif Mobi, DC Pay</p>
                    </div>
                  </Label>
                </div>
                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${method === "cash" ? "border-primary bg-primary/5" : "border-border"}`}>
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Banknote className="w-4 h-4 text-primary" />
                    <div>
                      <p className="font-medium text-sm">Наличные</p>
                      <p className="text-[11px] text-muted-foreground">Оплата мастеру после работы</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Security note */}
            <div className="flex items-start gap-2 bg-muted/50 rounded-xl p-3">
              <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Ваши данные защищены. Оплата обрабатывается через безопасное соединение.
              </p>
            </div>

            <Button
              onClick={handlePay}
              disabled={processing}
              className="w-full rounded-xl h-12 gap-2 text-base"
            >
              {processing ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Обработка...</>
              ) : method === "cash" ? (
                <><Banknote className="w-5 h-5" /> Подтвердить (наличные)</>
              ) : (
                <><CreditCard className="w-5 h-5" /> Оплатить {total.toLocaleString()} сомонӣ</>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Receipt dialog ──────────────────────────────────
interface ReceiptDialogProps {
  order: any;
  masterName?: string;
  clientName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReceiptDialog({ order, masterName, clientName, open, onOpenChange }: ReceiptDialogProps) {
  const { t } = useLanguage();
  if (!order) return null;

  const total = order.total_amount || order.budget || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="text-center space-y-4">
          {/* Receipt header */}
          <div className="space-y-1">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-bold">Чек об оплате</h3>
            <p className="text-xs text-muted-foreground">{t("brandName")}</p>
          </div>

          <Separator />

          {/* Details */}
          <div className="text-left space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Заказ №</span>
              <span className="font-mono text-xs">{order.id?.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Дата</span>
              <span>{new Date(order.paid_at || order.created_at).toLocaleDateString("ru-RU")}</span>
            </div>
            {clientName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Клиент</span>
                <span>{clientName}</span>
              </div>
            )}
            {masterName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Мастер</span>
                <span>{masterName}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Способ оплаты</span>
              <span>{order.payment_method === "card" ? "Карта" : order.payment_method === "mobile" ? "Мобильный" : "Наличные"}</span>
            </div>

            <Separator />

            <PriceBreakdown
              servicePrice={order.service_price || total}
              materialsCost={order.materials_cost || 0}
              urgencySurcharge={order.urgency_surcharge || 0}
              totalAmount={total}
              compact
            />
          </div>

          <Separator />

          <div className="flex items-center justify-center gap-1.5 text-emerald-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Оплачено</span>
          </div>

          <Button
            variant="outline"
            className="w-full rounded-xl gap-2"
            onClick={() => window.print()}
          >
            <Download className="w-4 h-4" />
            Скачать чек
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
