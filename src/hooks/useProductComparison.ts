import { useEffect, useState } from "react";

const STORAGE_KEY = "mc_product_compare";
const MAX_COMPARE_ITEMS = 4;

const readCompareIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
};

const writeCompareIds = (ids: string[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX_COMPARE_ITEMS)));
  window.dispatchEvent(new CustomEvent("mc-product-compare-updated"));
};

export function useProductComparison() {
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    setCompareIds(readCompareIds());

    const sync = () => setCompareIds(readCompareIds());
    window.addEventListener("storage", sync);
    window.addEventListener("mc-product-compare-updated", sync as EventListener);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("mc-product-compare-updated", sync as EventListener);
    };
  }, []);

  const toggleCompare = (productId: string) => {
    const current = readCompareIds();
    const exists = current.includes(productId);
    const next = exists
      ? current.filter((id) => id !== productId)
      : [...current, productId].slice(0, MAX_COMPARE_ITEMS);

    writeCompareIds(next);
    setCompareIds(next);
    return !exists;
  };

  const clearCompare = () => {
    writeCompareIds([]);
    setCompareIds([]);
  };

  const isComparing = (productId: string) => compareIds.includes(productId);

  return {
    compareIds,
    toggleCompare,
    clearCompare,
    isComparing,
    maxCompareItems: MAX_COMPARE_ITEMS,
  };
}
