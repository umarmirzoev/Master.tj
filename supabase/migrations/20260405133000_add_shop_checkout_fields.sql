ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_code text,
  ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

UPDATE public.shop_orders
SET
  subtotal = COALESCE(NULLIF(subtotal, 0), total),
  discount_amount = COALESCE(discount_amount, 0),
  payment_status = COALESCE(payment_status, 'unpaid')
WHERE subtotal = 0
   OR discount_amount IS NULL
   OR payment_status IS NULL;
