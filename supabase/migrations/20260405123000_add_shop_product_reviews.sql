-- Product reviews for shop items with automatic aggregate rating refresh.
CREATE TABLE IF NOT EXISTS public.shop_product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.shop_products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text DEFAULT NULL,
  is_approved boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);

ALTER TABLE public.shop_product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved product reviews"
ON public.shop_product_reviews
FOR SELECT
USING (is_approved = true);

CREATE POLICY "Authenticated users can add own product review"
ON public.shop_product_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own product review"
ON public.shop_product_reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own product review"
ON public.shop_product_reviews
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.refresh_shop_product_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_product_id uuid;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);

  UPDATE public.shop_products
  SET
    rating = COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.shop_product_reviews
      WHERE product_id = target_product_id AND is_approved = true
    ), 0),
    reviews_count = (
      SELECT COUNT(*)
      FROM public.shop_product_reviews
      WHERE product_id = target_product_id AND is_approved = true
    )
  WHERE id = target_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS refresh_shop_product_rating_after_insert ON public.shop_product_reviews;
DROP TRIGGER IF EXISTS refresh_shop_product_rating_after_update ON public.shop_product_reviews;
DROP TRIGGER IF EXISTS refresh_shop_product_rating_after_delete ON public.shop_product_reviews;

CREATE TRIGGER refresh_shop_product_rating_after_insert
AFTER INSERT ON public.shop_product_reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_shop_product_rating();

CREATE TRIGGER refresh_shop_product_rating_after_update
AFTER UPDATE ON public.shop_product_reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_shop_product_rating();

CREATE TRIGGER refresh_shop_product_rating_after_delete
AFTER DELETE ON public.shop_product_reviews
FOR EACH ROW EXECUTE FUNCTION public.refresh_shop_product_rating();
