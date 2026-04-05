import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Хук корзины управляет товарами пользователя, количеством и итоговой суммой заказа.
interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  include_installation: boolean;
  product?: any;
}

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  itemCount: number;
  totalPrice: number;
  addToCart: (productId: string, includeInstallation?: boolean) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  toggleInstallation: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType>({
  items: [], loading: false, itemCount: 0, totalPrice: 0,
  addToCart: async () => {}, removeFromCart: async () => {},
  updateQuantity: async () => {}, toggleInstallation: async () => {},
  clearCart: async () => {}, refreshCart: async () => {},
});

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Загружаем содержимое корзины вместе с привязанными карточками товаров.
  const fetchCart = useCallback(async () => {
    if (!user) { setItems([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from("cart_items")
      .select("*, product:shop_products(*)")
      .eq("user_id", user.id);
    setItems((data as any) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  // Добавляем товар в корзину или увеличиваем его количество, если он уже там есть.
  const addToCart = async (productId: string, includeInstallation = false) => {
    if (!user) { toast({ title: "Войдите в аккаунт", variant: "destructive" }); return; }
    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: 1, include_installation: includeInstallation });
    }
    toast({ title: "Добавлено в корзину ✓" });
    await fetchCart();
  };

  const removeFromCart = async (productId: string) => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
    await fetchCart();
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    if (!user || quantity < 1) return;
    await supabase.from("cart_items").update({ quantity }).eq("user_id", user.id).eq("product_id", productId);
    await fetchCart();
  };

  const toggleInstallation = async (productId: string) => {
    if (!user) return;
    const item = items.find(i => i.product_id === productId);
    if (item) {
      await supabase.from("cart_items").update({ include_installation: !item.include_installation }).eq("id", item.id);
      await fetchCart();
    }
  };

  const clearCart = async () => {
    if (!user) return;
    await supabase.from("cart_items").delete().eq("user_id", user.id);
    setItems([]);
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalPrice = items.reduce((sum, i) => {
    const p = (i as any).product;
    if (!p) return sum;
    let price = p.price * i.quantity;
    if (i.include_installation && p.installation_price) price += p.installation_price;
    return sum + price;
  }, 0);

  return (
    <CartContext.Provider value={{ items, loading, itemCount, totalPrice, addToCart, removeFromCart, updateQuantity, toggleInstallation, clearCart, refreshCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}
