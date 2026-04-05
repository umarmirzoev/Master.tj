
-- Allow anyone to view master profiles publicly (where they have service categories)
CREATE POLICY "Anyone can view master profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (service_categories IS NOT NULL AND array_length(service_categories, 1) > 0 AND approval_status = 'approved');

-- Add price columns to profiles for master pricing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS price_min numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_max numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
ADD COLUMN IF NOT EXISTS latitude numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude numeric DEFAULT NULL;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.
