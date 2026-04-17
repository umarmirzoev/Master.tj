export const LOCAL_SHOP_ORDERS_KEY = "mc_local_shop_orders";
export const LOCAL_SHOP_ORDER_ITEMS_KEY = "mc_fallback_orders";

export type LocalShopOrder = {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  subtotal: number;
  discount_amount: number;
  total: number;
  status: string;
  delivery_address: string | null;
  phone: string | null;
  customer_name: string | null;
  comments: string | null;
  payment_method: string | null;
  payment_status: string;
  promo_code: string | null;
  promo_code_id?: string | null;
  local_only?: boolean;
};

export type LocalShopOrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
  include_installation: boolean | null;
  installation_price: number | null;
};

const isBrowser = () => typeof window !== "undefined";

const safeParse = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const getLocalShopOrders = (): LocalShopOrder[] => {
  if (!isBrowser()) return [];

  const data = safeParse<LocalShopOrder[]>(localStorage.getItem(LOCAL_SHOP_ORDERS_KEY), []);
  return data
    .map((order) => ({ ...order, local_only: true }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const getLocalShopOrdersByUser = (userId: string) =>
  getLocalShopOrders().filter((order) => order.user_id === userId);

export const getLocalShopOrderById = (orderId: string) =>
  getLocalShopOrders().find((order) => order.id === orderId) || null;

export const saveLocalShopOrder = (order: LocalShopOrder) => {
  if (!isBrowser()) return;

  const existing = getLocalShopOrders().filter((item) => item.id !== order.id);
  localStorage.setItem(
    LOCAL_SHOP_ORDERS_KEY,
    JSON.stringify([{ ...order, local_only: true }, ...existing]),
  );
};

export const updateLocalShopOrderStatus = (orderId: string, status: string) => {
  if (!isBrowser()) return false;

  const orders = getLocalShopOrders();
  const index = orders.findIndex((order) => order.id === orderId);
  if (index === -1) return false;

  orders[index] = {
    ...orders[index],
    status,
    updated_at: new Date().toISOString(),
    local_only: true,
  };

  localStorage.setItem(LOCAL_SHOP_ORDERS_KEY, JSON.stringify(orders));
  return true;
};

export const getLocalShopOrderItemsMap = (): Record<string, LocalShopOrderItem[]> => {
  if (!isBrowser()) return {};
  return safeParse<Record<string, LocalShopOrderItem[]>>(
    localStorage.getItem(LOCAL_SHOP_ORDER_ITEMS_KEY),
    {},
  );
};

export const getLocalShopOrderItems = (orderId: string) => {
  const items = getLocalShopOrderItemsMap();
  return items[orderId] || [];
};

export const saveLocalShopOrderItems = (orderId: string, items: LocalShopOrderItem[]) => {
  if (!isBrowser()) return;

  const stored = getLocalShopOrderItemsMap();
  stored[orderId] = items;
  localStorage.setItem(LOCAL_SHOP_ORDER_ITEMS_KEY, JSON.stringify(stored));
};

export const mergeShopOrders = <T extends { id: string; created_at: string }>(
  remoteOrders: T[],
  localOrders: T[],
) => {
  const merged = new Map<string, T>();

  [...localOrders, ...remoteOrders].forEach((order) => {
    merged.set(order.id, order);
  });

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
};
