-- Allow fallback product IDs in shop_order_items
ALTER TABLE public.shop_order_items 
  ALTER COLUMN product_id TYPE text;

-- Remove the foreign key constraint that requires UUID
ALTER TABLE public.shop_order_items 
  DROP CONSTRAINT IF EXISTS shop_order_items_product_id_fkey;

-- Add a new check constraint to allow both UUID and text (fallback) product IDs
ALTER TABLE public.shop_order_items 
  ADD CONSTRAINT product_id_format_check 
  CHECK (
    product_id ~ '^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|fallback-.+)$'
  );