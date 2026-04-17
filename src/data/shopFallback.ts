import shopSeedSql from "../../supabase/migrations/20260308101450_571b784e-c3d4-413d-81fc-033e1063062a.sql?raw";
import { productRealData } from "./productRealData";

type CategoryMeta = {
  name: string;
  icon: string;
};

export type FallbackShopCategory = {
  id: string;
  name: string;
  icon: string;
  image_url: string;
  sort_order: number;
};

export type FallbackShopProduct = {
  id: string;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  image_url: string;
  images: string[];
  category_id: string;
  shop_categories: { name: string };
  rating: number;
  reviews_count: number;
  in_stock: boolean;
  is_popular: boolean;
  is_discounted: boolean;
  is_approved: boolean;
  installation_price: number | null;
  seller_type: "platform";
  master_id: null;
  promotion_end: string | null;
  created_at: string;
};

const CATEGORY_META: Record<string, CategoryMeta> = {
  "БЫТОВАЯ ТЕХНИКА": { name: "Бытовая техника", icon: "Tv" },
  "ВИДЕОНАБЛЮДЕНИЕ": { name: "Видеонаблюдение", icon: "Camera" },
  "ЗАМКИ И ДВЕРИ": { name: "Замки и двери", icon: "Lock" },
  "ИНСТРУМЕНТЫ": { name: "Инструменты", icon: "Wrench" },
  "КАБЕЛИ И ПРОВОДКА": { name: "Кабели и проводка", icon: "PlugZap" },
  "КАМЕРЫ НАБЛЮДЕНИЯ": { name: "Камеры наблюдения", icon: "Camera" },
  "ОСВЕЩЕНИЕ": { name: "Освещение", icon: "Lightbulb" },
  "РОЗЕТКИ И ВЫКЛЮЧАТЕЛИ": { name: "Розетки и выключатели", icon: "Zap" },
  "САНТЕХНИКА": { name: "Сантехника", icon: "Droplets" },
  "СМЕСИТЕЛИ": { name: "Смесители", icon: "Droplets" },
  "ТОВАРЫ ДЛЯ РЕМОНТА": { name: "Товары для ремонта", icon: "PaintBucket" },
  "ЭЛЕКТРИКА": { name: "Электрика", icon: "Zap" },
};

const INSTALLABLE_CATEGORIES = new Set([
  "БЫТОВАЯ ТЕХНИКА",
  "ВИДЕОНАБЛЮДЕНИЕ",
  "КАМЕРЫ НАБЛЮДЕНИЯ",
  "ОСВЕЩЕНИЕ",
  "РОЗЕТКИ И ВЫКЛЮЧАТЕЛИ",
  "САНТЕХНИКА",
  "СМЕСИТЕЛИ",
  "ЭЛЕКТРИКА",
]);

const categoryOrder: string[] = [];
const rawProducts: Array<{ category: string; id: string; name: string; image_url: string; images: string[] }> = [];

for (const line of shopSeedSql.split(/\r?\n/)) {
  // Matches both "-- CATEGORY (Name)" and "-- ===================\n-- CATEGORY (Name)"
  const categoryMatch = line.match(/^--\s+([^=].+?)\s+\(.+\)$/);
  if (categoryMatch) {
    const cat = categoryMatch[1].trim();
    if (CATEGORY_META[cat]) {
      categoryOrder.push(cat);
    }
    continue;
  }

  const productMatch = line.match(
    /^UPDATE shop_products SET image_url = '([^']+)'(?:, images = (.+?))? WHERE id = '([^']+)'; -- (.+)$/
  );

  if (productMatch && categoryOrder.length > 0) {
    rawProducts.push({
      category: categoryOrder[categoryOrder.length - 1],
      image_url: productMatch[1],
      images: [productMatch[1], ...Array.from((productMatch[2] || "").matchAll(/'([^']+)'/g)).map((item) => item[1])].filter(Boolean),
      id: `fallback-${productMatch[3]}`,
      name: productMatch[4],
    });
  }
}

const uniqueCategoryKeys = [...new Set(categoryOrder)];

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-zа-я0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");

export const fallbackShopCategories: FallbackShopCategory[] = uniqueCategoryKeys.map((key, index) => ({
  id: `fallback-category-${slugify(key)}`,
  name: CATEGORY_META[key]?.name ?? key,
  icon: CATEGORY_META[key]?.icon ?? "Package",
  image_url: "",
  sort_order: index + 1,
}));

const categoryIdByKey = new Map(fallbackShopCategories.map((category, index) => [uniqueCategoryKeys[index], category.id]));

export const fallbackShopProducts: FallbackShopProduct[] = rawProducts.map((product, index) => {
  const categoryIndex = uniqueCategoryKeys.indexOf(product.category);
  const itemIndex = rawProducts.filter((item) => item.category === product.category).findIndex((item) => item.id === product.id);
  
  const realData = productRealData[product.name];

  const price = realData?.price ?? (90 + categoryIndex * 35 + itemIndex * 18);
  const oldPrice = realData?.old_price ?? (itemIndex % 4 === 0 ? price + 35 + categoryIndex * 5 : null);
  const isDiscounted = !!oldPrice;
  const installationPrice = INSTALLABLE_CATEGORIES.has(product.category) ? 60 + categoryIndex * 10 : null;

  return {
    id: product.id,
    name: product.name,
    description: `${product.name} высокого качества с гарантией.`,
    price,
    old_price: oldPrice,
    image_url: realData?.image_url ?? product.image_url,
    images: Array.from(new Set([realData?.image_url ?? product.image_url, ...product.images])).filter(Boolean).slice(0, 5),
    category_id: categoryIdByKey.get(product.category) || "",
    shop_categories: { name: CATEGORY_META[product.category]?.name ?? product.category },
    rating: Number((4.6 + (itemIndex % 4) * 0.1).toFixed(1)),
    reviews_count: 8 + categoryIndex * 3 + itemIndex * 2,
    in_stock: true,
    is_popular: itemIndex < 2,
    is_discounted: isDiscounted,
    is_approved: true,
    installation_price: installationPrice,
    seller_type: "platform",
    master_id: null,
    promotion_end: isDiscounted && index < 12 ? "2026-12-31T23:59:59.000Z" : null,
    created_at: `2026-01-${String((index % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
  };
});

export const isFallbackCategoryId = (id?: string | null) => !!id && id.startsWith("fallback-category-");
export const isFallbackProductId = (id?: string | null) => !!id && id.startsWith("fallback-");

export const getFallbackCategoryById = (id?: string | null) =>
  fallbackShopCategories.find((category) => category.id === id) || null;

export const getFallbackProductById = (id?: string | null) =>
  fallbackShopProducts.find((product) => product.id === id) || null;

export const getFallbackProductsByCategoryId = (categoryId?: string | null) =>
  fallbackShopProducts.filter((product) => product.category_id === categoryId);
