
-- Add master_id (seller) column to shop_products
ALTER TABLE public.shop_products 
  ADD COLUMN IF NOT EXISTS master_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0.20,
  ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS seller_type text DEFAULT 'platform';

-- Create master_product_sales table for tracking
CREATE TABLE IF NOT EXISTS public.master_product_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  master_id uuid NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  product_price numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  master_earnings numeric NOT NULL DEFAULT 0,
  include_installation boolean DEFAULT false,
  installation_price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.master_product_sales ENABLE ROW LEVEL SECURITY;

-- RLS for master_product_sales
CREATE POLICY "Masters view own sales" ON public.master_product_sales
  FOR SELECT USING (auth.uid() = master_id);

CREATE POLICY "Admins manage all sales" ON public.master_product_sales
  FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "System can insert sales" ON public.master_product_sales
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS: masters can manage own products
CREATE POLICY "Masters can insert own products" ON public.shop_products
  FOR INSERT WITH CHECK (
    auth.uid() = master_id AND has_role(auth.uid(), 'master')
  );

CREATE POLICY "Masters can update own products" ON public.shop_products
  FOR UPDATE USING (
    auth.uid() = master_id AND has_role(auth.uid(), 'master')
  );

CREATE POLICY "Masters can delete own products" ON public.shop_products
  FOR DELETE USING (
    auth.uid() = master_id AND has_role(auth.uid(), 'master')
  );
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.
