import { useEffect, useState } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import {
  getLocalShopOrderItemsMap,
  getLocalShopOrders,
  mergeShopOrders,
  updateLocalShopOrderStatus,
} from "@/lib/localShopOrders";
import {
  CheckCircle,
  Edit3,
  Eye,
  EyeOff,
  Loader2,
  Package,
  Phone,
  Plus,
  Search,
  ShoppingCart,
  TicketPercent,
  Trash2,
  Truck,
  User,
  XCircle,
} from "lucide-react";

const orderStatuses = [
  { value: "pending", label: "Ожидает подтверждения" },
  { value: "confirmed", label: "Подтвержден" },
  { value: "processing", label: "Собирается" },
  { value: "shipped", label: "В пути" },
  { value: "delivered", label: "Доставлен" },
  { value: "completed", label: "Завершен" },
  { value: "cancelled", label: "Отменен" },
];

const paymentLabels: Record<string, string> = {
  cash: "Наличные",
  card: "Карта",
  transfer: "Перевод",
};

const paymentStatusLabels: Record<string, string> = {
  unpaid: "При получении",
  pending: "Ждет оплаты",
  paid: "Оплачено",
  failed: "Ошибка",
};

export default function AdminShopManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [shopOrders, setShopOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

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
      supabase
        .from("shop_orders")
        .select("*, shop_order_items(*, shop_products(id, name, image_url))")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const productLookup = Object.fromEntries(((prodsRes.data as any[]) || []).map((product) => [product.id, product]));
    const localItems = getLocalShopOrderItemsMap();
    const localOrders = getLocalShopOrders().map((order) => ({
      ...order,
      shop_order_items: (localItems[order.id] || []).map((item) => ({
        ...item,
        shop_products: productLookup[item.product_id]
          ? {
              id: productLookup[item.product_id].id,
              name: productLookup[item.product_id].name,
              image_url: productLookup[item.product_id].image_url,
            }
          : null,
      })),
    }));

    setProducts((prodsRes.data as any[]) || []);
    setCategories(catsRes.data || []);
    setShopOrders(mergeShopOrders((ordersRes.data as any[]) || [], localOrders));
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`admin-shop-manager-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_orders" }, () => {
        void load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "shop_order_items" }, () => {
        void load();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "mc_local_shop_orders" || event.key === "mc_fallback_orders") {
        void load();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const resetForm = () => {
    setName("");
    setDesc("");
    setPrice("");
    setOldPrice("");
    setCatId("");
    setImageUrl("");
    setStockQty("100");
    setInstallPrice("");
    setIsDiscounted(false);
    setPromoStart("");
    setPromoEnd("");
    setPromoLabel("");
    setEditing(null);
  };

  const openEdit = (product: any) => {
    setEditing(product);
    setName(product.name);
    setDesc(product.description || "");
    setPrice(product.price.toString());
    setOldPrice(product.old_price?.toString() || "");
    setCatId(product.category_id);
    setImageUrl(product.image_url || "");
    setStockQty((product.stock_qty || 0).toString());
    setInstallPrice(product.installation_price?.toString() || "");
    setIsDiscounted(!!product.is_discounted);
    setPromoStart(product.promotion_start ? product.promotion_start.slice(0, 16) : "");
    setPromoEnd(product.promotion_end ? product.promotion_end.slice(0, 16) : "");
    setPromoLabel(product.promotion_label || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name || !price || !catId) {
      toast({ title: "Заполните обязательные поля", variant: "destructive" });
      return;
    }

    setSaving(true);
    const data: any = {
      name,
      description: desc,
      price: parseFloat(price),
      old_price: oldPrice ? parseFloat(oldPrice) : null,
      category_id: catId,
      image_url: imageUrl || null,
      stock_qty: parseInt(stockQty, 10) || 0,
      in_stock: (parseInt(stockQty, 10) || 0) > 0,
      installation_price: installPrice ? parseFloat(installPrice) : null,
      is_approved: true,
      seller_type: "platform",
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

    if (error) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Товар обновлен" : "Товар добавлен" });
      setShowForm(false);
      resetForm();
      load();
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("shop_products").delete().eq("id", id);
    toast({ title: "Товар удален" });
    load();
  };

  const toggleApproval = async (id: string, current: boolean) => {
    await supabase.from("shop_products").update({ is_approved: !current }).eq("id", id);
    toast({ title: !current ? "Товар одобрен" : "Товар скрыт" });
    load();
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingOrderId(orderId);
    let error = null;

    if (orderId.startsWith("local-shop-")) {
      updateLocalShopOrderStatus(orderId, status);
    } else {
      const result = await supabase.from("shop_orders").update({ status }).eq("id", orderId);
      error = result.error;
    }
    setUpdatingOrderId(null);

    if (error) {
      toast({ title: "Не удалось обновить статус", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Статус заказа обновлен" });
    load();
  };

  const quickAcceptOrder = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    let error = null;

    if (orderId.startsWith("local-shop-")) {
      updateLocalShopOrderStatus(orderId, "confirmed");
    } else {
      const result = await supabase.from("shop_orders").update({ status: "confirmed" }).eq("id", orderId);
      error = result.error;
    }
    setUpdatingOrderId(null);

    if (error) {
      toast({ title: "Не удалось принять заказ", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Заказ подтвержден" });
    load();
  };

  const quickCancelOrder = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    let error = null;

    if (orderId.startsWith("local-shop-")) {
      updateLocalShopOrderStatus(orderId, "cancelled");
    } else {
      const result = await supabase.from("shop_orders").update({ status: "cancelled" }).eq("id", orderId);
      error = result.error;
    }
    setUpdatingOrderId(null);

    if (error) {
      toast({ title: "Не удалось отменить заказ", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Заказ отменен" });
    load();
  };

  const filteredProducts = products.filter((product) => {
    if (filterType === "platform" && product.seller_type !== "platform") return false;
    if (filterType === "master" && product.seller_type !== "master") return false;
    if (filterType === "pending" && product.is_approved !== false) return false;
    if (search) {
      const query = search.toLowerCase();
      if (!product.name.toLowerCase().includes(query) && !product.shop_categories?.name?.toLowerCase().includes(query)) {
        return false;
      }
    }
    return true;
  });

  const platformProducts = products.filter((product) => product.seller_type === "platform");
  const masterProducts = products.filter((product) => product.seller_type === "master");
  const pendingProducts = products.filter((product) => !product.is_approved);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Все товары", value: products.length, icon: Package, bg: "bg-blue-500/10", color: "text-blue-600" },
          { label: "Платформа", value: platformProducts.length, icon: ShoppingCart, bg: "bg-emerald-500/10", color: "text-emerald-600" },
          { label: "От мастеров", value: masterProducts.length, icon: User, bg: "bg-purple-500/10", color: "text-purple-600" },
          { label: "На модерации", value: pendingProducts.length, icon: Eye, bg: "bg-amber-500/10", color: "text-amber-600" },
        ].map((stat, index) => (
          <Card key={index} className="border-border/60">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Поиск товаров..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все товары</SelectItem>
            <SelectItem value="platform">Платформа</SelectItem>
            <SelectItem value="master">От мастеров</SelectItem>
            <SelectItem value="pending">На модерации</SelectItem>
          </SelectContent>
        </Select>
        <Button className="rounded-full gap-2" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus className="h-4 w-4" />
          Добавить товар
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <Card key={product.id} className={`overflow-hidden border-border/60 ${!product.is_approved ? "ring-2 ring-amber-400" : ""}`}>
            <div className="relative aspect-video bg-muted/30">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute left-2 top-2 flex gap-1">
                {product.seller_type === "master" && <Badge className="bg-emerald-500 text-white text-[10px]">От мастера</Badge>}
                {!product.is_approved && <Badge className="bg-amber-500 text-white text-[10px]">На модерации</Badge>}
              </div>
            </div>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{product.shop_categories?.name}</p>
              <h3 className="mb-1 line-clamp-1 font-semibold text-foreground">{product.name}</h3>
              <div className="mb-3 flex items-center gap-2">
                <span className="font-bold text-foreground">{product.price} с.</span>
                {product.old_price && <span className="text-sm text-muted-foreground line-through">{product.old_price} с.</span>}
                <span className="ml-auto text-xs text-muted-foreground">Ост: {product.stock_qty || 0}</span>
              </div>
              <div className="flex gap-2">
                {product.seller_type === "master" && (
                  <Button
                    size="sm"
                    variant={product.is_approved ? "outline" : "default"}
                    className="rounded-full text-xs gap-1"
                    onClick={() => toggleApproval(product.id, product.is_approved)}
                  >
                    {product.is_approved ? <EyeOff className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
                    {product.is_approved ? "Скрыть" : "Одобрить"}
                  </Button>
                )}
                <Button size="sm" variant="outline" className="rounded-full text-xs gap-1" onClick={() => openEdit(product)}>
                  <Edit3 className="h-3 w-3" />
                  Ред.
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(product.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <Package className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p>Товаров не найдено</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-foreground">Заказы магазина</h3>
            <p className="text-sm text-muted-foreground">Управление статусами, оплатой, скидками и составом заказа.</p>
          </div>
          <Badge variant="secondary">{shopOrders.length}</Badge>
        </div>

        <div className="space-y-3">
          {shopOrders.map((order) => (
            <Card key={order.id} className="border-border/60">
              <CardContent className="space-y-4 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">
                        Заказ #{String(order.id).slice(0, 8).toUpperCase()}
                      </p>
                      <Badge className={order.status === "cancelled" ? "bg-rose-100 text-rose-800" : order.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}>
                        {orderStatuses.find((status) => status.value === order.status)?.label || order.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground">{order.customer_name || "Клиент"} • {order.phone || "Телефон не указан"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString("ru-RU")} • {order.shop_order_items?.length || 0} товар(а)
                    </p>
                    <p className="text-xs text-muted-foreground">{order.delivery_address || "Адрес не указан"}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px]">
                    <div className="rounded-2xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Оплата</p>
                      <p className="text-sm font-medium text-foreground">
                        {paymentLabels[order.payment_method || "cash"] || "Не указана"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {paymentStatusLabels[order.payment_status || "unpaid"] || order.payment_status}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-muted/30 p-3">
                      <p className="text-xs text-muted-foreground">Сумма</p>
                      <p className="text-sm font-medium text-foreground">{order.total} сомонӣ</p>
                      {order.discount_amount > 0 && (
                        <p className="mt-1 text-xs text-emerald-700">
                          -{order.discount_amount} сомонӣ {order.promo_code ? `• ${order.promo_code}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap gap-2">
                    {(order.shop_order_items || []).slice(0, 3).map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        <span>{item.shop_products?.name || "Товар"}</span>
                        <span>x{item.quantity}</span>
                      </div>
                    ))}
                    {(order.shop_order_items || []).length > 3 && (
                      <div className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
                        И еще {(order.shop_order_items || []).length - 3}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status === "pending" && (
                      <>
                        <Button
                          className="rounded-full gap-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => quickAcceptOrder(order.id)}
                          disabled={updatingOrderId === order.id}
                        >
                          {updatingOrderId === order.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                          Подтвердить
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                          onClick={() => quickCancelOrder(order.id)}
                          disabled={updatingOrderId === order.id}
                        >
                          <XCircle className="h-4 w-4" />
                          Отклонить
                        </Button>
                      </>
                    )}
                    <Select
                      value={order.status}
                      onValueChange={(value) => updateOrderStatus(order.id, value)}
                      disabled={updatingOrderId === order.id || order.status === "pending"}
                    >
                      <SelectTrigger className="w-[220px] rounded-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {orderStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="rounded-full" onClick={() => setSelectedOrder(order)}>
                      <Truck className="h-4 w-4" />
                      Детали
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={(value) => { if (!value) resetForm(); setShowForm(value); }}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Редактировать товар" : "Добавить товар"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Название товара" value={name} onChange={(e) => setName(e.target.value)} />
            <Select value={catId} onValueChange={setCatId}>
              <SelectTrigger>
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Цена" value={price} onChange={(e) => setPrice(e.target.value)} />
              <Input type="number" placeholder="Старая цена" value={oldPrice} onChange={(e) => setOldPrice(e.target.value)} />
            </div>
            <Textarea placeholder="Описание" value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
            <Input placeholder="URL фото" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input type="number" placeholder="Количество" value={stockQty} onChange={(e) => setStockQty(e.target.value)} />
              <Input type="number" placeholder="Цена установки" value={installPrice} onChange={(e) => setInstallPrice(e.target.value)} />
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox checked={isDiscounted} onCheckedChange={(value) => setIsDiscounted(!!value)} />
                <span className="text-sm font-medium text-foreground">Товар со скидкой</span>
              </label>
              {isDiscounted && (
                <>
                  <Input placeholder="Название акции" value={promoLabel} onChange={(e) => setPromoLabel(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input type="datetime-local" value={promoStart} onChange={(e) => setPromoStart(e.target.value)} />
                    <Input type="datetime-local" value={promoEnd} onChange={(e) => setPromoEnd(e.target.value)} />
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Отмена
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOrder} onOpenChange={(value) => !value && setSelectedOrder(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder ? `Заказ #${String(selectedOrder.id).slice(0, 8).toUpperCase()}` : "Детали заказа"}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Клиент</p>
                  <p className="mt-1 font-medium text-foreground">{selectedOrder.customer_name || "Клиент"}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    {selectedOrder.phone || "Телефон не указан"}
                  </p>
                </div>
                <div className="rounded-2xl bg-muted/30 p-4">
                  <p className="text-xs text-muted-foreground">Скидка и промо</p>
                  {selectedOrder.discount_amount > 0 ? (
                    <>
                      <p className="mt-1 font-medium text-emerald-700">-{selectedOrder.discount_amount} сомонӣ</p>
                      {selectedOrder.promo_code && (
                        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <TicketPercent className="h-4 w-4" />
                          {selectedOrder.promo_code}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">Скидка не применялась</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Адрес доставки</p>
                <p className="mt-1 text-sm text-foreground">{selectedOrder.delivery_address || "Адрес не указан"}</p>
                {selectedOrder.comments && (
                  <p className="mt-2 text-sm text-muted-foreground">{selectedOrder.comments}</p>
                )}
              </div>

              <div className="space-y-3">
                {(selectedOrder.shop_order_items || []).map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between rounded-2xl border border-border/60 p-4">
                    <div>
                      <p className="font-medium text-foreground">{item.shop_products?.name || "Товар"}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.price} сомонӣ x {item.quantity}
                        {item.include_installation ? ` • установка +${item.installation_price || 0}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold text-foreground">
                      {item.price * item.quantity + (item.include_installation ? (item.installation_price || 0) * item.quantity : 0)} сомонӣ
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
