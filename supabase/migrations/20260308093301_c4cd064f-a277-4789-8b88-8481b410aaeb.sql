
-- Add ranking and quality fields to master_listings
ALTER TABLE public.master_listings 
  ADD COLUMN IF NOT EXISTS ranking_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_orders integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_orders integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS response_time_avg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repeat_clients integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS complaints integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_flag text DEFAULT 'good',
  ADD COLUMN IF NOT EXISTS is_top_master boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_ranking_update timestamp with time zone DEFAULT now();

-- Add same fields to profiles for masters who don't have listings
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ranking_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_flag text DEFAULT 'good';

-- Create function to calculate ranking score
CREATE OR REPLACE FUNCTION public.calculate_master_ranking(
  p_avg_rating numeric,
  p_completed_orders integer,
  p_cancelled_orders integer,
  p_total_reviews integer,
  p_response_time_avg numeric,
  p_repeat_clients integer,
  p_complaints integer
) RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ROUND((
    -- Rating weight: 35% (normalized to 0-100)
    COALESCE(p_avg_rating, 0) * 20.0 * 0.35
    -- Completed orders weight: 25% (log scale, max ~100)
    + LEAST(LN(GREATEST(p_completed_orders, 1) + 1) * 20, 100) * 0.25
    -- Cancellation penalty: 15% (lower is better)
    + GREATEST(100 - COALESCE(
        CASE WHEN (p_completed_orders + p_cancelled_orders) > 0
          THEN (p_cancelled_orders::numeric / (p_completed_orders + p_cancelled_orders)) * 100
          ELSE 0 END
      , 0), 0) * 0.15
    -- Reviews count weight: 10%
    + LEAST(LN(GREATEST(p_total_reviews, 1) + 1) * 15, 100) * 0.10
    -- Response time: 10% (faster is better, normalized)
    + GREATEST(100 - COALESCE(p_response_time_avg, 0) * 2, 0) * 0.10
    -- Repeat clients: 5%
    + LEAST(COALESCE(p_repeat_clients, 0) * 5, 100) * 0.05
  )::numeric, 1)
$$;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.
