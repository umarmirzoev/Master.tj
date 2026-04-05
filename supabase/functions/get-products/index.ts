import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ProductQuery {
  category_id?: string;
  search?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  is_discounted?: boolean;
  is_popular?: boolean;
  sort?: "price_asc" | "price_desc" | "rating" | "newest";
  page?: number;
  limit?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const query: ProductQuery = {
      category_id: url.searchParams.get("category_id") || undefined,
      search: url.searchParams.get("search") || undefined,
      min_price: url.searchParams.get("min_price") ? Number(url.searchParams.get("min_price")) : undefined,
      max_price: url.searchParams.get("max_price") ? Number(url.searchParams.get("max_price")) : undefined,
      in_stock: url.searchParams.get("in_stock") === "true",
      is_discounted: url.searchParams.get("is_discounted") === "true",
      is_popular: url.searchParams.get("is_popular") === "true",
      sort: (url.searchParams.get("sort") as any) || "newest",
      page: url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1,
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 20,
    };

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    let filterQuery = "is_approved=eq.true";
    
    if (query.category_id) {
      filterQuery += `&category_id=eq.${query.category_id}`;
    }
    if (query.in_stock) {
      filterQuery += "&in_stock=eq.true";
    }
    if (query.is_discounted) {
      filterQuery += "&is_discounted=eq.true";
    }
    if (query.is_popular) {
      filterQuery += "&is_popular=eq.true";
    }
    if (query.min_price) {
      filterQuery += `&price=gte.${query.min_price}`;
    }
    if (query.max_price) {
      filterQuery += `&price=lte.${query.max_price}`;
    }

    let orderBy = "created_at.desc";
    if (query.sort === "price_asc") orderBy = "price.asc";
    if (query.sort === "price_desc") orderBy = "price.desc";
    if (query.sort === "rating") orderBy = "rating.desc";

    const offset = (query.page! - 1) * query.limit!;

    const fetchUrl = `${SUPABASE_URL}/rest/v1/shop_products?select=*,shop_categories(name)&${filterQuery}&order=${orderBy}&limit=${query.limit}&offset=${offset}`;
    
    const res = await fetch(fetchUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.status}`);
    }

    let products = await res.json();

    if (query.search) {
      const searchLower = query.search.toLowerCase();
      products = products.filter((p: any) =>
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.shop_categories?.name?.toLowerCase().includes(searchLower)
      );
    }

    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/shop_products?${filterQuery}&select=id`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const totalCount = (await countRes.json()).length;

    return new Response(
      JSON.stringify({
        products,
        pagination: {
          page: query.page,
          limit: query.limit,
          total: totalCount,
          total_pages: Math.ceil(totalCount / query.limit!),
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("get-products error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});