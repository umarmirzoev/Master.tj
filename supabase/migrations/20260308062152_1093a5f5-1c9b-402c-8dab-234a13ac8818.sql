
-- Create a public master listings table for the catalog
CREATE TABLE public.master_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid DEFAULT NULL, -- optional link to real auth user
  full_name text NOT NULL,
  phone text DEFAULT '',
  avatar_url text DEFAULT '',
  bio text DEFAULT '',
  service_categories text[] DEFAULT '{}',
  working_districts text[] DEFAULT '{}',
  experience_years int DEFAULT 0,
  average_rating numeric DEFAULT 0,
  total_reviews int DEFAULT 0,
  price_min numeric DEFAULT 0,
  price_max numeric DEFAULT 0,
  latitude numeric DEFAULT NULL,
  longitude numeric DEFAULT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.master_listings ENABLE ROW LEVEL SECURITY;

-- Anyone can view active master listings
CREATE POLICY "Anyone can view active masters"
ON public.master_listings FOR SELECT
USING (is_active = true);

-- Admins can manage listings
CREATE POLICY "Admins can manage master listings"
ON public.master_listings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.
