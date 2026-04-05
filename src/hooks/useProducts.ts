import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price: number | null;
  image_url: string | null;
  images: string[] | null;
  category_id: string | null;
  shop_categories?: { name: string };
  rating: number;
  reviews_count: number;
  in_stock: boolean;
  is_popular: boolean;
  is_discounted: boolean;
  is_approved: boolean;
  installation_price: number | null;
  seller_type: string | null;
  master_id: string | null;
  promotion_end: string | null;
  created_at: string;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ProductFilters {
  category_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  is_discounted?: boolean;
  is_popular?: boolean;
  sort?: "price_asc" | "price_desc" | "rating" | "newest";
}

export function useProducts(initialFilters?: ProductFilters) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  });
  const [filters, setFilters] = useState<ProductFilters>(initialFilters || {});

  const fetchProducts = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(filters.limit || 20));

      if (filters.category_id) params.set("category_id", filters.category_id);
      if (filters.search) params.set("search", filters.search);
      if (filters.min_price) params.set("min_price", String(filters.min_price));
      if (filters.max_price) params.set("max_price", String(filters.max_price));
      if (filters.in_stock) params.set("in_stock", "true");
      if (filters.is_discounted) params.set("is_discounted", "true");
      if (filters.is_popular) params.set("is_popular", "true");
      if (filters.sort) params.set("sort", filters.sort);

      const { data, error: fnError } = await supabase.functions.invoke<ProductsResponse>("get-products", {
        params: Object.fromEntries(params),
      });

      if (fnError) throw fnError;

      setProducts(data.products);
      setPagination(data.pagination);
    } catch (e: any) {
      console.error("useProducts error:", e);
      setError(e.message || "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchProducts(1);
  }, [filters]);

  const updateFilters = useCallback((newFilters: Partial<ProductFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const goToPage = useCallback((page: number) => {
    fetchProducts(page);
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    pagination,
    filters,
    updateFilters,
    goToPage,
    refresh: () => fetchProducts(pagination.page),
  };
}

export function useProduct(id: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke<ProductsResponse>("get-products", {
          params: { limit: "1" },
        });

        if (fnError) throw fnError;

        const found = data.products.find((p) => p.id === id);
        setProduct(found || null);
      } catch (e: any) {
        console.error("useProduct error:", e);
        setError(e.message || "Failed to fetch product");
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  return { product, loading, error };
}