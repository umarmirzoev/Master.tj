import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Tag, Percent, DollarSign, Calendar, Hash, Loader2 } from "lucide-react";

interface PromoCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expires_at: string | null;
  usage_limit: number | null;
  times_used: number;
  is_active: boolean;
  created_at: string;
}

// Менеджер промокодов позволяет создавать, отключать и удалять коды скидок.
export default function PromoCodeManager() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [codes, setCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState({ code: "", discount_type: "percentage", discount_value: 10, expires_at: "", usage_limit: "" });
  const [saving, setSaving] = useState(false);

  const loadCodes = async () => {
    const { data } = await supabase.from("promo_codes").select("*").order("created_at", { ascending: false });
    setCodes((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadCodes(); }, []);

  const createCode = async () => {
    if (!newCode.code) { toast({ title: t("promoFillCode"), variant: "destructive" }); return; }
    setSaving(true);
    const insert: any = {
      code: newCode.code.toUpperCase(),
      discount_type: newCode.discount_type,
      discount_value: newCode.discount_value,
      created_by: user?.id,
    };
    if (newCode.expires_at) insert.expires_at = new Date(newCode.expires_at).toISOString();
    if (newCode.usage_limit) insert.usage_limit = parseInt(newCode.usage_limit);
    const { error } = await supabase.from("promo_codes").insert(insert);
    setSaving(false);
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("promoCreated") });
      setShowCreate(false);
      setNewCode({ code: "", discount_type: "percentage", discount_value: 10, expires_at: "", usage_limit: "" });
      loadCodes();
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    await supabase.from("promo_codes").update({ is_active: !currentActive }).eq("id", id);
    loadCodes();
  };

  const deleteCode = async (id: string) => {
    await supabase.from("promo_codes").delete().eq("id", id);
    loadCodes();
    toast({ title: t("promoDeleted") });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Tag className="w-5 h-5 text-primary" /> {t("promoCodes")}
        </h3>
        <Button size="sm" onClick={() => setShowCreate(true)} className="rounded-full gap-1">
          <Plus className="w-4 h-4" /> {t("promoCreate")}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
      ) : codes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">{t("promoEmpty")}</div>
      ) : (
        <div className="space-y-2">
          {codes.map(code => (
            <Card key={code.id} className={`${!code.is_active ? "opacity-50" : ""}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">{code.code}</span>
                    <Badge variant={code.is_active ? "default" : "secondary"}>
                      {code.is_active ? t("promoActive") : t("promoInactive")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      {code.discount_type === "percentage" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                      {code.discount_value}{code.discount_type === "percentage" ? "%" : " сом."}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3" /> {code.times_used}/{code.usage_limit || "∞"}
                    </span>
                    {code.expires_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(code.expires_at).toLocaleDateString("ru-RU")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="text-xs rounded-full" onClick={() => toggleActive(code.id, code.is_active)}>
                    {code.is_active ? t("promoDeactivate") : t("promoActivate")}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500 rounded-full h-8 w-8 p-0" onClick={() => deleteCode(code.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("promoCreate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input placeholder={t("promoCodeName")} value={newCode.code} onChange={e => setNewCode({ ...newCode, code: e.target.value })} className="font-mono uppercase" />
            <Select value={newCode.discount_type} onValueChange={v => setNewCode({ ...newCode, discount_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">{t("promoPercent")}</SelectItem>
                <SelectItem value="fixed">{t("promoFixed")}</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder={t("promoValue")} value={newCode.discount_value} onChange={e => setNewCode({ ...newCode, discount_value: Number(e.target.value) })} />
            <Input type="datetime-local" placeholder={t("promoExpiry")} value={newCode.expires_at} onChange={e => setNewCode({ ...newCode, expires_at: e.target.value })} />
            <Input type="number" placeholder={t("promoUsageLimit")} value={newCode.usage_limit} onChange={e => setNewCode({ ...newCode, usage_limit: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>{t("cancel")}</Button>
            <Button onClick={createCode} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("promoCreate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
