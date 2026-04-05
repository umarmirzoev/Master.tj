import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useCart } from "@/hooks/useCart";

// Хук рекомендаций подбирает товары по просмотрам, корзине и популярности магазина.
export interface RecommendedProduct {
  id: string;
  name: string;
  image_url: string | null;
  price: number;
  old_price?: number | null;
  rating?: number | null;
  reviews_count?: number | null;
  in_stock?: boolean | null;
  category_id: string;
  shop_categories?: { name: string } | null;
}

// Логика рекомендаций сначала анализирует интересы пользователя, затем добирает популярные товары.
export function useRecommendations(excludeIds: string[] = [], limit = 8) {
  const { recentlyViewed } = useRecentlyViewed();
  const { items: cartItems } = useCart();
  const [recommendations, setRecommendations] = useState<RecommendedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);

      // 1. Gather preference signals
      const viewedCategoryIds = new Set<string>();
      const viewedProductIds = new Set(excludeIds);

      // Get categories from recently viewed products
      if (recentlyViewed.length > 0) {
        const ids = recentlyViewed.map((p) => p.id);
        ids.forEach((id) => viewedProductIds.add(id));

        const { data: viewedProducts } = await supabase
          .from("shop_products")
          .select("category_id")
          .in("id", ids);

        viewedProducts?.forEach((p) => viewedCategoryIds.add(p.category_id));
      }

      // Get categories from cart items
      if (cartItems.length > 0) {
        cartItems.forEach((item) => {
          viewedProductIds.add(item.product_id);
          const product = (item as any).product;
          if (product?.category_id) viewedCategoryIds.add(product.category_id);
        });
      }

      const preferredCategories = Array.from(viewedCategoryIds);
      const excludeList = Array.from(viewedProductIds);

      let results: RecommendedProduct[] = [];

      // 2. Fetch personalized recommendations from preferred categories
      if (preferredCategories.length > 0) {
        const { data: personalized } = await supabase
          .from("shop_products")
          .select("*, shop_categories(name)")
          .in("category_id", preferredCategories)
          .eq("in_stock", true)
          .not("id", "in", `(${excludeList.join(",")})`)
          .order("is_popular", { ascending: false })
          .order("rating", { ascending: false })
          .limit(limit);

        results = (personalized as RecommendedProduct[]) || [];
      }

      // 3. Fill remaining slots with trending/popular products
      if (results.length < limit) {
        const existingIds = [...excludeList, ...results.map((r) => r.id)];
        const remaining = limit - results.length;

        const { data: popular } = await supabase
          .from("shop_products")
          .select("*, shop_categories(name)")
          .eq("in_stock", true)
          .eq("is_popular", true)
          .not("id", "in", `(${existingIds.join(",")})`)
          .order("rating", { ascending: false })
          .limit(remaining);

        if (popular) results = [...results, ...(popular as RecommendedProduct[])];
      }

      // 4. If still not enough, add highest rated products
      if (results.length < limit) {
        const existingIds = [...excludeList, ...results.map((r) => r.id)];
        const remaining = limit - results.length;

        const { data: topRated } = await supabase
          .from("shop_products")
          .select("*, shop_categories(name)")
          .eq("in_stock", true)
          .not("id", "in", `(${existingIds.join(",")})`)
          .order("rating", { ascending: false })
          .order("reviews_count", { ascending: false })
          .limit(remaining);

        if (topRated) results = [...results, ...(topRated as RecommendedProduct[])];
      }

      setRecommendations(results.slice(0, limit));
      setLoading(false);
    };

    fetchRecommendations();
  }, [recentlyViewed.length, cartItems.length, excludeIds.join(","), limit]);

  return { recommendations, loading };
}
