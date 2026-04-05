
ALTER TABLE public.shop_products 
  ADD COLUMN IF NOT EXISTS promotion_start timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promotion_end timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promotion_label text DEFAULT NULL;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.
