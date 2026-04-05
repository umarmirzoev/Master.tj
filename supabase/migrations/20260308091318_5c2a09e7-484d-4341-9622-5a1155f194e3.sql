
-- Add payment fields to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS service_price NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS materials_cost NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS urgency_surcharge NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS platform_commission NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.
