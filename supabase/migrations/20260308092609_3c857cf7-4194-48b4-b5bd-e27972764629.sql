
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS master_payout numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_date timestamp with time zone DEFAULT NULL;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.
