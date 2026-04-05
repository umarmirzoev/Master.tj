import { useState, useEffect, useCallback } from "react";

// Хук недавно просмотренных товаров хранит локальную историю в localStorage.
export interface RecentProduct {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  old_price?: number | null;
  rating?: number | null;
}

const STORAGE_KEY = "mc_recently_viewed";
const MAX_ITEMS = 8;

// Читаем историю просмотров из localStorage с защитой от ошибок парсинга.
function load(): RecentProduct[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [items, setItems] = useState<RecentProduct[]>(load);

  // Добавляем товар в начало истории и убираем дубликаты.
  const addProduct = useCallback((product: RecentProduct) => {
    setItems((prev) => {
      const filtered = prev.filter((p) => p.id !== product.id);
      const next = [product, ...filtered].slice(0, MAX_ITEMS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { recentlyViewed: items, addProduct };
}
