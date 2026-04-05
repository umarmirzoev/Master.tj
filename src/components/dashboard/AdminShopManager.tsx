import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Plus, Edit3, Trash2, CheckCircle, XCircle,
  Search, Eye, EyeOff, Loader2, ShoppingCart, User,
} from "lucide-react";

// Раздел управления магазином позволяет администратору модерировать и редактировать товары.
export default function AdminShopManager() {
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // all, platform, master, pending
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [catId, setCatId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [stockQty, setStockQty] = useState("100");
  const [installPrice, setInstallPrice] = useState("");
  const [isDiscounted, setIsDiscounted] = useState(false);
  const [promoStart, setPromoStart] = useState("");
  const [promoEnd, setPromoEnd] = useState("");
  const [promoLabel, setPromoLabel] = useState("");

  const load = async () => {
    setLoading(true);
    const [prodsRes, catsRes, ordersRes] = await Promise.all([
      supabase.from("shop_products").select("*, shop_categories(name)").order("created_at", { ascending: false }),
      supabase.from("shop_categories").select("*").order("sort_order"),
      supabase.from("shop_orders").select("*, shop_order_items(*)").order("created_at", { ascending: false }).limit(50),
    ]);
    setProducts((prodsRes.data as any) || []);
    setCategories(catsRes.data || []);
    setShopOrders((ordersRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setName(""); setDesc(""); setPrice(""); setOldPrice("");
    setCatId(""); setImageUrl(""); setStockQty("100"); setInstallPrice("");
    setIsDiscounted(false); setPromoStart(""); setPromoEnd(""); setPromoLabel("");
    setEditing(null);
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setName(p.name); setDesc(p.description || ""); setPrice(p.price.toString());
    setOldPrice(p.old_price?.toString() || ""); setCatId(p.category_id);
    setImageUrl(p.image_url || ""); setStockQty((p.stock_qty || 0).toString());
    setInstallPrice(p.installation_price?.toString() || "");
    setIsDiscounted(!!p.is_discounted);
    setPromoStart(p.promotion_start ? p.promotion_start.slice(0, 16) : "");
    setPromoEnd(p.promotion_end ? p.promotion_end.slice(0, 16) : "");
    setPromoLabel(p.promotion_label || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name || !price || !catId) { toast({ title: "Заполните поля", variant: "destructive" }); return; }
    setSaving(true);
    const data: any = {
      name, description: desc, price: parseFloat(price),
      old_price: oldPrice ? parseFloat(oldPrice) : null,
      category_id: catId, image_url: imageUrl || null,
      stock_qty: parseInt(stockQty) || 0,
      in_stock: parseInt(stockQty) > 0,
      installation_price: installPrice ? parseFloat(installPrice) : null,
      is_approved: true, seller_type: "platform",
      is_discounted: isDiscounted,
      promotion_start: promoStart ? new Date(promoStart).toISOString() : null,
      promotion_end: promoEnd ? new Date(promoEnd).toISOString() : null,
      promotion_label: promoLabel || null,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("shop_products").update(data).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("shop_products").insert(data));
    }
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else { toast({ title: editing ? "Обновлено" : "Добавлено" }); setShowForm(false); resetForm(); load(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("shop_products").delete().eq("id", id);
    toast({ title: "Удалено" }); load();
  };

  const toggleApproval = async (id: string, current: boolean) => {
    await supabase.from("shop_products").update({ is_approved: !current }).eq("id", id);
    toast({ title: !current ? "Товар одобрен" : "Товар скрыт" }); load();
  };

  const filtered = products.filter(p => {
    if (filterType === "platform" && p.seller_type !== "platform") return false;
    if (filterType === "master" && p.seller_type !== "master") return false;
    if (filterType === "pending" && p.is_approved !== false) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.shop_categories?.name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const platformProducts = products.filter(p => p.seller_type === "platform");
  const masterProducts = products.filter(p => p.seller_type === "master");
  const pendingProducts = products.filter(p => !p.is_approved);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Все товары", value: products.length, icon: Package, bg: "bg-blue-500/10", color: "text-blue-600" },
          { label: "Платформа", value: platformProducts.length, icon: ShoppingCart, bg: "bg-emerald-500/10", color: "text-emerald-600" },
          { label: "От мастеров", value: masterProducts.length, icon: User, bg: "bg-purple-500/10", color: "text-purple-600" },
          { label: "На модерации", value: pendingProducts.length, icon: Eye, bg: "bg-amber-500/10", color: "text-amber-600" },
        ].map((s, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-lg font-bold text-foreground">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Поиск товаров..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 rounded-full" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44 rounded-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все товары</SelectItem>
            <SelectItem value="platform">Платформа</SelectItem>
            <SelectItem value="master">От мастеров</SelectItem>
            <SelectItem value="pending">На модерации</SelectItem>
          </SelectContent>
        </Select>
        <Button className="rounded-full gap-2" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Добавить товар
        </Button>
      </div>

      {/* Pending master products alert */}
      {pendingProducts.length > 0 && filterType !== "pending" && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 cursor-pointer" onClick={() => setFilterType("pending")}>
          <CardContent className="p-4 flex items-center gap-3">
            <Eye className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              {pendingProducts.length} товар(ов) от мастеров ожидают модерации
            </p>
          </CardContent>
        </Card>
      )}

      {/* Product grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <Card key={p.id} className={`overflow-hidden border-border/60 ${!p.is_approved ? "ring-2 ring-amber-400" : ""}`}>
            <div className="aspect-video bg-muted/30 flex items-center justify-center relative">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <Package className="w-12 h-12 text-muted-foreground/30" />}
              <div className="absolute top-2 left-2 flex gap-1">
                {p.seller_type === "master" && <Badge className="bg-emerald-500 text-white text-[10px]">От мастера</Badge>}
                {!p.is_approved && <Badge className="bg-amber-500 text-white text-[10px]">На модерации</Badge>}
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{p.shop_categories?.name}</p>
              <h3 className="font-semibold text-foreground line-clamp-1 mb-1">{p.name}</h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="font-bold text-foreground">{p.price} с.</span>
                {p.old_price && <span className="text-sm text-muted-foreground line-through">{p.old_price} с.</span>}
                <span className="text-xs text-muted-foreground ml-auto">Ост: {p.stock_qty || 0}</span>
              </div>
              <div className="flex gap-2">
                {p.seller_type === "master" && (
                  <Button size="sm" variant={p.is_approved ? "outline" : "default"} className="rounded-full text-xs gap-1" onClick={() => toggleApproval(p.id, p.is_approved)}>
                    {p.is_approved ? <><EyeOff className="w-3 h-3" /> Скрыть</> : <><CheckCircle className="w-3 h-3" /> Одобрить</>}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="rounded-full text-xs gap-1" onClick={() => openEdit(p)}>
                  <Edit3 className="w-3 h-3" /> Ред.
                </Button>
                <Button size="sm" variant="outline" className="rounded-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Товаров не найдено</p>
        </div>
      )}

      {/* Shop orders summary */}
      {shopOrders.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-foreground mb-4">Последние заказы магазина</h3>
          <div className="space-y-2">
            {shopOrders.slice(0, 10).map(o => (
              <Card key={o.id} className="border-border/60">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{o.customer_name || "Клиент"} — {o.phone}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("ru-RU")} • {o.shop_order_items?.length || 0} товаров</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{o.total} с.</p>
                    <Badge className={o.status === "completed" ? "bg-emerald-100 text-emerald-800" : o.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}>
                      {o.status === "completed" ? "Выполнен" : o.status === "pending" ? "Ожидает" : o.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) resetForm(); setShowForm(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Редактировать" : "Добавить товар"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Название товара" value={name} onChange={e => setName(e.target.value)} />
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger>
              <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Цена" value={price} onChange={e => setPrice(e.target.value)} />
              <Input type="number" placeholder="Старая цена" value={oldPrice} onChange={e => setOldPrice(e.target.value)} />
            </div>
            <Textarea placeholder="Описание" value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
            <Input placeholder="URL фото" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Кол-во" value={stockQty} onChange={e => setStockQty(e.target.value)} />
              <Input type="number" placeholder="Цена установки" value={installPrice} onChange={e => setInstallPrice(e.target.value)} />
            </div>

            {/* Promotion section */}
            <div className="border-t border-border pt-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={isDiscounted} onCheckedChange={(v) => setIsDiscounted(!!v)} />
                <span className="text-sm font-medium text-foreground">Товар со скидкой</span>
              </label>
              {isDiscounted && (
                <>
                  <Input placeholder="Название акции (напр. Летняя распродажа)" value={promoLabel} onChange={e => setPromoLabel(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Начало акции</label>
                      <Input type="datetime-local" value={promoStart} onChange={e => setPromoStart(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Конец акции</label>
                      <Input type="datetime-local" value={promoEnd} onChange={e => setPromoEnd(e.target.value)} />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />} {editing ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
