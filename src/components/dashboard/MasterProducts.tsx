import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Package, Plus, Edit3, Trash2, ShoppingCart, TrendingUp,
  AlertCircle, CheckCircle, DollarSign, Loader2, Eye,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  category_id: string;
  image_url: string;
  in_stock: boolean;
  stock_qty: number;
  installation_price: number | null;
  is_approved: boolean;
  seller_type: string;
  shop_categories?: { name: string };
}

// Раздел товаров мастера управляет каталогом его товаров и статистикой продаж.
export default function MasterProducts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [inStock, setInStock] = useState(true);
  const [stockQty, setStockQty] = useState("10");
  const [installPrice, setInstallPrice] = useState("");

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    const [prodsRes, catsRes, salesRes] = await Promise.all([
      supabase.from("shop_products").select("*, shop_categories(name)").eq("master_id", user.id).order("created_at", { ascending: false }),
      supabase.from("shop_categories").select("*").order("sort_order"),
      supabase.from("master_product_sales").select("*").eq("master_id", user.id),
    ]);
    setProducts((prodsRes.data as any) || []);
    setCategories(catsRes.data || []);
    setSales((salesRes.data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const resetForm = () => {
    setName(""); setDescription(""); setPrice(""); setOldPrice("");
    setCategoryId(""); setImageUrl(""); setInStock(true);
    setStockQty("10"); setInstallPrice("");
    setEditingProduct(null);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setDescription(p.description || "");
    setPrice(p.price.toString());
    setOldPrice(p.old_price?.toString() || "");
    setCategoryId(p.category_id);
    setImageUrl(p.image_url || "");
    setInStock(p.in_stock);
    setStockQty((p.stock_qty || 0).toString());
    setInstallPrice(p.installation_price?.toString() || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !name || !price || !categoryId) {
      toast({ title: "Заполните обязательные поля", variant: "destructive" });
      return;
    }
    setSaving(true);
    const data = {
      name,
      description,
      price: parseFloat(price),
      old_price: oldPrice ? parseFloat(oldPrice) : null,
      category_id: categoryId,
      image_url: imageUrl || null,
      in_stock: inStock,
      stock_qty: parseInt(stockQty) || 0,
      installation_price: installPrice ? parseFloat(installPrice) : null,
      master_id: user.id,
      seller_type: "master",
      is_approved: false, // needs admin approval
      commission_rate: 0.20,
    };

    let error;
    if (editingProduct) {
      ({ error } = await supabase.from("shop_products").update(data).eq("id", editingProduct.id));
    } else {
      ({ error } = await supabase.from("shop_products").insert(data));
    }

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingProduct ? "Товар обновлён" : "Товар добавлен" });
      setShowForm(false);
      resetForm();
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("shop_products").delete().eq("id", id);
    if (error) toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    else { toast({ title: "Товар удалён" }); fetchData(); }
  };

  const activeProducts = products.filter(p => p.in_stock && p.is_approved);
  const outOfStock = products.filter(p => !p.in_stock);
  const pendingApproval = products.filter(p => !p.is_approved);
  const totalSalesCount = sales.reduce((s, sale) => s + sale.quantity, 0);
  const totalEarnings = sales.reduce((s, sale) => s + (sale.master_earnings || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Всего товаров", value: products.length, icon: Package, color: "text-blue-600", bg: "bg-blue-500/10" },
          { label: "Активные", value: activeProducts.length, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-500/10" },
          { label: "Нет в наличии", value: outOfStock.length, icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-500/10" },
          { label: "Продажи", value: totalSalesCount, icon: ShoppingCart, color: "text-purple-600", bg: "bg-purple-500/10" },
          { label: "Заработок", value: `${totalEarnings.toLocaleString()} с.`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10" },
        ].map((s, i) => (
          <Card key={i} className="border-border/60">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold text-foreground">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Мои товары</h2>
        <Button className="rounded-full gap-2" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Добавить товар
        </Button>
      </div>

      {/* Pending approval notice */}
      {pendingApproval.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {pendingApproval.length} товар(ов) ожидают модерации администратором
            </p>
          </CardContent>
        </Card>
      )}

      {/* Product list */}
      {products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">У вас пока нет товаров</p>
            <Button className="rounded-full gap-2" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Добавить первый товар
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <Card key={p.id} className="overflow-hidden border-border/60 hover:shadow-md transition-all">
              <div className="aspect-video bg-muted/30 flex items-center justify-center relative">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className="w-12 h-12 text-muted-foreground/30" />
                )}
                <div className="absolute top-2 left-2 flex gap-1.5">
                  {!p.is_approved && <Badge className="bg-amber-500 text-white text-[10px]">На модерации</Badge>}
                  {!p.in_stock && <Badge variant="secondary" className="text-[10px]">Нет в наличии</Badge>}
                </div>
              </div>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">{p.shop_categories?.name}</p>
                <h3 className="font-semibold text-foreground mb-2 line-clamp-1">{p.name}</h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg font-bold text-foreground">{p.price} с.</span>
                  {p.old_price && <span className="text-sm text-muted-foreground line-through">{p.old_price} с.</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                  <span>Остаток: {p.stock_qty || 0} шт.</span>
                  {p.installation_price && <span>• Установка: {p.installation_price} с.</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1 rounded-full gap-1.5 text-xs" onClick={() => openEdit(p)}>
                    <Edit3 className="w-3 h-3" /> Редактировать
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-full text-xs text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) { resetForm(); } setShowForm(v); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Редактировать товар" : "Добавить товар"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Название *</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Смеситель для кухни" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Категория *</label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Выберите категорию" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Цена (сомонӣ) *</label>
                <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="200" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Старая цена</label>
                <Input type="number" value={oldPrice} onChange={e => setOldPrice(e.target.value)} placeholder="250" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Описание</label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание товара..." rows={3} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Ссылка на фото</label>
              <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Кол-во на складе</label>
                <Input type="number" value={stockQty} onChange={e => setStockQty(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Цена установки</label>
                <Input type="number" value={installPrice} onChange={e => setInstallPrice(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={inStock} onCheckedChange={setInStock} />
              <span className="text-sm text-foreground">В наличии</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Комиссия платформы: 20%. После модерации товар появится в магазине.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Отмена</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingProduct ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
