-- ������ bootstrap ������ Supabase ������� ��� Master Chas
-- ���������� ������� � SQL Editor ������ �������


-- ===== BEGIN 20260218082041_bcde74ce-2f3b-40ab-8947-fca193f2ae93.sql =====


-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('client', 'master', 'admin', 'super_admin');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Service categories
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ru TEXT NOT NULL,
  name_tj TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT 'Wrench',
  color TEXT NOT NULL DEFAULT 'from-blue-400 to-blue-600',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- 5. Services
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.service_categories(id) ON DELETE CASCADE NOT NULL,
  name_ru TEXT NOT NULL,
  name_tj TEXT NOT NULL DEFAULT '',
  name_en TEXT NOT NULL DEFAULT '',
  unit TEXT NOT NULL DEFAULT 'шт',
  price_min NUMERIC NOT NULL DEFAULT 0,
  price_avg NUMERIC NOT NULL DEFAULT 0,
  price_max NUMERIC NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- 6. Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  master_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','accepted','in_progress','completed','cancelled')),
  address TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  preferred_time TEXT DEFAULT '',
  budget NUMERIC DEFAULT 0,
  description TEXT DEFAULT '',
  client_rating INT CHECK (client_rating >= 1 AND client_rating <= 5),
  client_review TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 7. Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  master_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- 8. Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 9. Auto-create profile + client role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'client');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 11. RLS Policies

-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- User roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Service categories (public read)
CREATE POLICY "Anyone can view categories" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.service_categories FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Services (public read)
CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Orders
CREATE POLICY "Clients can view own orders" ON public.orders FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Masters can view assigned orders" ON public.orders FOR SELECT USING (auth.uid() = master_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Clients can create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Masters can update assigned orders" ON public.orders FOR UPDATE USING (auth.uid() = master_id);
CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Clients can update own orders" ON public.orders FOR UPDATE USING (auth.uid() = client_id);

-- Reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Clients can create reviews" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = client_id
  AND EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND client_id = auth.uid() AND status = 'completed')
);
CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260218082041_bcde74ce-2f3b-40ab-8947-fca193f2ae93.sql =====


-- ===== BEGIN 20260219014358_6863ea8f-ed39-48c4-915c-3a0ceab41bd6.sql =====

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260219014358_6863ea8f-ed39-48c4-915c-3a0ceab41bd6.sql =====


-- ===== BEGIN 20260220012445_4d05ee46-7b8f-461b-a0e0-bf12c339a566.sql =====


-- Add master profile fields to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_categories TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS experience_years INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS working_districts TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'active';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Add order workflow timestamps
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_id UUID,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Add photos column to reviews if not exists
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Create storage bucket for master documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')));
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260220012445_4d05ee46-7b8f-461b-a0e0-bf12c339a566.sql =====


-- ===== BEGIN 20260308061919_b99958a8-c703-4276-83cb-d33d3ff7d11e.sql =====


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

-- ===== END 20260308061919_b99958a8-c703-4276-83cb-d33d3ff7d11e.sql =====


-- ===== BEGIN 20260308062152_1093a5f5-1c9b-402c-8dab-234a13ac8818.sql =====


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

-- ===== END 20260308062152_1093a5f5-1c9b-402c-8dab-234a13ac8818.sql =====


-- ===== BEGIN 20260308072924_7c8a8ea3-cd64-4f55-b18a-9c334f0cf07f.sql =====


CREATE TABLE public.master_portfolio (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_id UUID NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  category TEXT DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.master_portfolio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portfolio" ON public.master_portfolio
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage portfolio" ON public.master_portfolio
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308072924_7c8a8ea3-cd64-4f55-b18a-9c334f0cf07f.sql =====


-- ===== BEGIN 20260308083221_0a51f884-3e91-45bb-aeb4-7bf2474592df.sql =====


-- Master applications table
CREATE TABLE public.master_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  district TEXT NOT NULL DEFAULT '',
  specialization TEXT NOT NULL DEFAULT '',
  experience_years INTEGER NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  photo_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.master_applications ENABLE ROW LEVEL SECURITY;

-- Users can view own applications
CREATE POLICY "Users can view own applications"
  ON public.master_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create applications
CREATE POLICY "Users can create applications"
  ON public.master_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
  ON public.master_applications FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Admins can update applications
CREATE POLICY "Admins can update all applications"
  ON public.master_applications FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Update timestamp trigger
CREATE TRIGGER update_master_applications_updated_at
  BEFORE UPDATE ON public.master_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308083221_0a51f884-3e91-45bb-aeb4-7bf2474592df.sql =====


-- ===== BEGIN 20260308085732_5f5f85c0-3a7f-4456-b4ea-a49de8787ee6.sql =====

-- Allow masters to manage their own portfolio items
CREATE POLICY "Masters can insert own portfolio"
ON public.master_portfolio
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = master_id);

CREATE POLICY "Masters can update own portfolio"
ON public.master_portfolio
FOR UPDATE
TO authenticated
USING (auth.uid() = master_id);

CREATE POLICY "Masters can delete own portfolio"
ON public.master_portfolio
FOR DELETE
TO authenticated
USING (auth.uid() = master_id);

-- Allow masters to view available (unassigned) orders
CREATE POLICY "Masters can view new orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  status = 'new' AND has_role(auth.uid(), 'master'::app_role)
);
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308085732_5f5f85c0-3a7f-4456-b4ea-a49de8787ee6.sql =====


-- ===== BEGIN 20260308090900_875b0e5b-a527-426f-9f8e-f9e83f265309.sql =====


-- Order messages table for chat per order
CREATE TABLE public.order_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Clients can view messages on their orders
CREATE POLICY "Clients can view own order messages"
ON public.order_messages FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_messages.order_id AND orders.client_id = auth.uid())
);

-- Masters can view messages on their assigned orders
CREATE POLICY "Masters can view assigned order messages"
ON public.order_messages FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_messages.order_id AND orders.master_id = auth.uid())
);

-- Admins can view all messages
CREATE POLICY "Admins can view all order messages"
ON public.order_messages FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Clients can send messages on their orders
CREATE POLICY "Clients can send messages on own orders"
ON public.order_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_messages.order_id AND orders.client_id = auth.uid())
);

-- Masters can send messages on assigned orders
CREATE POLICY "Masters can send messages on assigned orders"
ON public.order_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_messages.order_id AND orders.master_id = auth.uid())
);

-- Admins can send messages on any order
CREATE POLICY "Admins can send messages on any order"
ON public.order_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
);

-- Users can mark their own received messages as read
CREATE POLICY "Users can update read status"
ON public.order_messages FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_messages.order_id 
    AND (orders.client_id = auth.uid() OR orders.master_id = auth.uid())
  )
);

-- Enable realtime for order messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308090900_875b0e5b-a527-426f-9f8e-f9e83f265309.sql =====


-- ===== BEGIN 20260308091318_5c2a09e7-484d-4341-9622-5a1155f194e3.sql =====


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

-- ===== END 20260308091318_5c2a09e7-484d-4341-9622-5a1155f194e3.sql =====


-- ===== BEGIN 20260308092609_3c857cf7-4194-48b4-b5bd-e27972764629.sql =====


ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS master_payout numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_date timestamp with time zone DEFAULT NULL;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308092609_3c857cf7-4194-48b4-b5bd-e27972764629.sql =====


-- ===== BEGIN 20260308093301_c4cd064f-a277-4789-8b88-8481b410aaeb.sql =====


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

-- ===== END 20260308093301_c4cd064f-a277-4789-8b88-8481b410aaeb.sql =====


-- ===== BEGIN 20260308093317_8370440f-3031-4563-84ba-d758629696ef.sql =====


ALTER FUNCTION public.calculate_master_ranking(numeric, integer, integer, integer, numeric, integer, integer) SET search_path = public;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308093317_8370440f-3031-4563-84ba-d758629696ef.sql =====


-- ===== BEGIN 20260308094131_b5e7c834-312d-4235-97ac-6cd1c4bfb672.sql =====


-- Fix ALL RLS policies: drop RESTRICTIVE, recreate as PERMISSIVE

-- ========== master_applications ==========
DROP POLICY IF EXISTS "Admins can update all applications" ON public.master_applications;
DROP POLICY IF EXISTS "Admins can view all applications" ON public.master_applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.master_applications;
DROP POLICY IF EXISTS "Users can view own applications" ON public.master_applications;

CREATE POLICY "Admins can update all applications" ON public.master_applications FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can view all applications" ON public.master_applications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can create applications" ON public.master_applications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own applications" ON public.master_applications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ========== profiles ==========
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view master profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Anyone can view master profiles" ON public.profiles FOR SELECT USING ((service_categories IS NOT NULL) AND (array_length(service_categories, 1) > 0) AND (approval_status = 'approved'::text));
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ========== user_roles ==========
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admin can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ========== orders ==========
DROP POLICY IF EXISTS "Admins can manage orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Clients can create orders" ON public.orders;
DROP POLICY IF EXISTS "Clients can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Clients can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Masters can update assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Masters can view assigned orders" ON public.orders;
DROP POLICY IF EXISTS "Masters can view new orders" ON public.orders;

CREATE POLICY "Admins can manage orders" ON public.orders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Clients can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Clients can update own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Clients can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = client_id);
CREATE POLICY "Masters can update assigned orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = master_id);
CREATE POLICY "Masters can view assigned orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = master_id);
CREATE POLICY "Masters can view new orders" ON public.orders FOR SELECT TO authenticated USING ((status = 'new'::text) AND has_role(auth.uid(), 'master'::app_role));

-- ========== notifications ==========
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;

CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Authenticated users can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ========== master_listings ==========
DROP POLICY IF EXISTS "Admins can manage master listings" ON public.master_listings;
DROP POLICY IF EXISTS "Anyone can view active masters" ON public.master_listings;

CREATE POLICY "Admins can manage master listings" ON public.master_listings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Anyone can view active masters" ON public.master_listings FOR SELECT USING (is_active = true);

-- ========== reviews ==========
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
DROP POLICY IF EXISTS "Clients can create reviews" ON public.reviews;

CREATE POLICY "Admins can manage reviews" ON public.reviews FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Clients can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK ((auth.uid() = client_id) AND (EXISTS (SELECT 1 FROM orders WHERE orders.id = reviews.order_id AND orders.client_id = auth.uid() AND orders.status = 'completed'::text)));

-- ========== order_messages ==========
DROP POLICY IF EXISTS "Admins can send messages on any order" ON public.order_messages;
DROP POLICY IF EXISTS "Admins can view all order messages" ON public.order_messages;
DROP POLICY IF EXISTS "Clients can send messages on own orders" ON public.order_messages;
DROP POLICY IF EXISTS "Clients can view own order messages" ON public.order_messages;
DROP POLICY IF EXISTS "Masters can send messages on assigned orders" ON public.order_messages;
DROP POLICY IF EXISTS "Masters can view assigned order messages" ON public.order_messages;
DROP POLICY IF EXISTS "Users can update read status" ON public.order_messages;

CREATE POLICY "Admins can send messages on any order" ON public.order_messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)));
CREATE POLICY "Admins can view all order messages" ON public.order_messages FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Clients can send messages on own orders" ON public.order_messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id) AND (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_messages.order_id AND orders.client_id = auth.uid())));
CREATE POLICY "Clients can view own order messages" ON public.order_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_messages.order_id AND orders.client_id = auth.uid()));
CREATE POLICY "Masters can send messages on assigned orders" ON public.order_messages FOR INSERT TO authenticated WITH CHECK ((auth.uid() = sender_id) AND (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_messages.order_id AND orders.master_id = auth.uid())));
CREATE POLICY "Masters can view assigned order messages" ON public.order_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_messages.order_id AND orders.master_id = auth.uid()));
CREATE POLICY "Users can update read status" ON public.order_messages FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_messages.order_id AND (orders.client_id = auth.uid() OR orders.master_id = auth.uid())));

-- ========== master_portfolio ==========
DROP POLICY IF EXISTS "Admins can manage portfolio" ON public.master_portfolio;
DROP POLICY IF EXISTS "Anyone can view portfolio" ON public.master_portfolio;
DROP POLICY IF EXISTS "Masters can delete own portfolio" ON public.master_portfolio;
DROP POLICY IF EXISTS "Masters can insert own portfolio" ON public.master_portfolio;
DROP POLICY IF EXISTS "Masters can update own portfolio" ON public.master_portfolio;

CREATE POLICY "Admins can manage portfolio" ON public.master_portfolio FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Anyone can view portfolio" ON public.master_portfolio FOR SELECT USING (true);
CREATE POLICY "Masters can delete own portfolio" ON public.master_portfolio FOR DELETE TO authenticated USING (auth.uid() = master_id);
CREATE POLICY "Masters can insert own portfolio" ON public.master_portfolio FOR INSERT TO authenticated WITH CHECK (auth.uid() = master_id);
CREATE POLICY "Masters can update own portfolio" ON public.master_portfolio FOR UPDATE TO authenticated USING (auth.uid() = master_id);

-- ========== service_categories ==========
DROP POLICY IF EXISTS "Admins can manage categories" ON public.service_categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.service_categories;

CREATE POLICY "Admins can manage categories" ON public.service_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Anyone can view categories" ON public.service_categories FOR SELECT USING (true);

-- ========== services ==========
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view services" ON public.services;

CREATE POLICY "Admins can manage services" ON public.services FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Anyone can view services" ON public.services FOR SELECT USING (true);
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308094131_b5e7c834-312d-4235-97ac-6cd1c4bfb672.sql =====


-- ===== BEGIN 20260308094513_2cd0fd0f-9280-41ac-aa9c-3cb4da249db7.sql =====


-- Shop categories
CREATE TABLE public.shop_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Package',
  image_url text DEFAULT '',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shop categories" ON public.shop_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage shop categories" ON public.shop_categories FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Shop products
CREATE TABLE public.shop_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.shop_categories(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  old_price numeric DEFAULT NULL,
  image_url text DEFAULT '',
  images text[] DEFAULT '{}',
  specs jsonb DEFAULT '{}',
  in_stock boolean DEFAULT true,
  stock_qty integer DEFAULT 100,
  rating numeric DEFAULT 4.5,
  reviews_count integer DEFAULT 0,
  related_service_category text DEFAULT NULL,
  installation_price numeric DEFAULT NULL,
  is_popular boolean DEFAULT false,
  is_discounted boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view shop products" ON public.shop_products FOR SELECT USING (true);
CREATE POLICY "Admins can manage shop products" ON public.shop_products FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Cart items
CREATE TABLE public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid REFERENCES public.shop_products(id) ON DELETE CASCADE NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  include_installation boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Shop orders
CREATE TABLE public.shop_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total numeric NOT NULL DEFAULT 0,
  delivery_address text DEFAULT '',
  phone text DEFAULT '',
  customer_name text DEFAULT '',
  comments text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own shop orders" ON public.shop_orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users create shop orders" ON public.shop_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage shop orders" ON public.shop_orders FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Shop order items
CREATE TABLE public.shop_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.shop_orders(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES public.shop_products(id) NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  include_installation boolean DEFAULT false,
  installation_price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own order items" ON public.shop_order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = shop_order_items.order_id AND shop_orders.user_id = auth.uid()));
CREATE POLICY "Users create order items" ON public.shop_order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM shop_orders WHERE shop_orders.id = shop_order_items.order_id AND shop_orders.user_id = auth.uid()));
CREATE POLICY "Admins manage order items" ON public.shop_order_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308094513_2cd0fd0f-9280-41ac-aa9c-3cb4da249db7.sql =====


-- ===== BEGIN 20260308095229_6b2651cb-e794-4692-aeda-2cd6d1293c03.sql =====


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

-- ===== END 20260308095229_6b2651cb-e794-4692-aeda-2cd6d1293c03.sql =====


-- ===== BEGIN 20260308101450_571b784e-c3d4-413d-81fc-033e1063062a.sql =====


-- =============================================
-- БЫТОВАЯ ТЕХНИКА (Appliances)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1643810806660-612a4ceb2e02?w=600&h=600&fit=crop', images = '{}' WHERE id = 'aef796bc-a437-452e-a26b-f3f99f74ede5'; -- Вентилятор напольный
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=600&fit=crop', images = '{}' WHERE id = 'f060b3f9-d0d0-4c30-a12c-436a18f97ca2'; -- Газовая плита
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1631545806609-22cda91a8921?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1631545806609-22cda91a8921?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1625961332771-3f40b0e2bdcf?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=800&fit=crop'] WHERE id = '2a1ae15c-34d2-4bbe-a507-41c7ce37fab1'; -- Кондиционер 12000
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1625961332771-3f40b0e2bdcf?w=600&h=600&fit=crop', images = '{}' WHERE id = '728dd893-88cd-4dc3-9752-cfb2eedd65f5'; -- Кондиционер 9000
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=600&h=600&fit=crop', images = '{}' WHERE id = 'f0c01393-04e7-49c8-b911-8f40c0541eef'; -- Микроволновая печь
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1607400201889-565b1ee75f8e?w=600&h=600&fit=crop', images = '{}' WHERE id = 'b8424ada-b9b3-4204-9ad8-4fdcf908fc91'; -- Обогреватель
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = '1734f840-9f17-4e32-b851-69ebfc9aada6'; -- Пылесос
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800&h=800&fit=crop'] WHERE id = '31f03a73-cfc5-43b4-9067-70846d8acf13'; -- Стиральная машина

-- =============================================
-- ВИДЕОНАБЛЮДЕНИЕ (CCTV)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=600&fit=crop', images = '{}' WHERE id = '964158a8-715e-4b82-965a-539f73232c15'; -- IP камера 4МП
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1580745294615-2a0b553d7e6a?w=600&h=600&fit=crop', images = '{}' WHERE id = '4e6580f4-a8f7-40ac-b6d3-745edad03a25'; -- PTZ камера
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1597424216809-3ba4e58e6a03?w=600&h=600&fit=crop', images = '{}' WHERE id = 'c4b740cd-09f5-4f88-ae2f-07bd016c6169'; -- Блок питания
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop', images = '{}' WHERE id = 'b1445833-8612-4572-be02-a6c97ee79c24'; -- Видеорегистратор
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&h=600&fit=crop', images = '{}' WHERE id = '9d908188-e122-41f3-b330-0f5383ac3dc8'; -- Домофон
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop', images = '{}' WHERE id = '56fcddaa-9ef1-4ec6-b44c-b1ec3310bc78'; -- Жёсткий диск
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&h=600&fit=crop', images = '{}' WHERE id = '50451fb2-7305-4a4a-9edb-25b2631a7f6f'; -- Кабель UTP
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1580745294615-2a0b553d7e6a?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&h=800&fit=crop'] WHERE id = '5eba1b99-d4cf-458b-8d5e-5afecb97b408'; -- Комплект 4 камеры

-- =============================================
-- ЗАМКИ И ДВЕРИ (Locks & Doors)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&h=600&fit=crop', images = '{}' WHERE id = '874655d0-5944-443a-a2a6-78d35bb2a500'; -- Глазок дверной
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1517697471339-4aa32003c11a?w=600&h=600&fit=crop', images = '{}' WHERE id = '6a21f710-67b6-4953-84b2-0072e706dce3'; -- Дверная ручка
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600&h=600&fit=crop', images = '{}' WHERE id = 'd8b46bda-d671-4417-bad2-e73f47cc7912'; -- Доводчик
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1558002038-1055907df827?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=800&fit=crop'] WHERE id = '75c72e4b-efd1-4c75-90d4-278747e0b8d3'; -- Замок врезной
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&h=600&fit=crop', images = '{}' WHERE id = '43aa0439-d0a7-48f0-b082-496cd46ecec4'; -- Навесной замок
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1517697471339-4aa32003c11a?w=600&h=600&fit=crop', images = '{}' WHERE id = '392df55b-14b5-4940-856c-e27976cba993'; -- Петли
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&h=600&fit=crop', images = '{}' WHERE id = '12b08d37-d49a-4260-96a4-d9763f27b7df'; -- Цилиндр замка
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1558002038-1055907df827?w=800&h=800&fit=crop'] WHERE id = '7ddf5753-f7d8-4bae-a77f-0e520a15b14c'; -- Электронный замок

-- =============================================
-- ИНСТРУМЕНТЫ (Tools)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=600&fit=crop', images = '{}' WHERE id = '72630ab4-c4f6-4115-a1fb-81e6470da452'; -- Болгарка
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=600&h=600&fit=crop', images = '{}' WHERE id = '829bbf23-b672-4387-a7cc-8b8b1d33885c'; -- Лазерный уровень
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&h=600&fit=crop', images = '{}' WHERE id = 'e89e3f0a-c6f2-4777-a03c-3b3a3ee16c9b'; -- Набор ключей
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1590479773265-7464e5d48118?w=600&h=600&fit=crop', images = '{}' WHERE id = '384d663b-1109-43b9-b3a4-fb1e002c180c'; -- Набор отвёрток
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&h=800&fit=crop'] WHERE id = 'f76b840c-510d-4fb3-9fb1-17ce101265fb'; -- Перфоратор
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&h=600&fit=crop', images = '{}' WHERE id = 'f7af56e1-0205-4953-b124-38fc4fadc2e7'; -- Рулетка
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&h=800&fit=crop'] WHERE id = '2e7ef2c3-6232-4bfb-9665-de9582b45381'; -- Шуруповёрт
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=600&h=600&fit=crop', images = '{}' WHERE id = '1ff8823c-a86d-49eb-b17a-3e5dd5519acb'; -- Электролобзик

-- =============================================
-- КАБЕЛИ И ПРОВОДКА (Cables & Wiring)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&h=600&fit=crop', images = '{}' WHERE id = '2bfeccfc-9924-4f64-8f56-0e17858fcd7a'; -- Гофротруба
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&h=600&fit=crop', images = '{}' WHERE id = '26bb2934-79dc-4bcf-b07b-be36ef7d722b'; -- Изолента
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=800&fit=crop'] WHERE id = 'f6bf0b83-cbae-4bb0-b6da-1d5a237c98cb'; -- Кабель ВВГ 2x1.5
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&h=600&fit=crop', images = '{}' WHERE id = '512527d4-e5a3-4c8a-97ab-524366e5c6be'; -- Кабель ВВГ 3x2.5
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&h=600&fit=crop', images = '{}' WHERE id = '7c61b5d4-59d2-4b90-90f4-ca0bb82dabbe'; -- Кабель-канал
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&h=600&fit=crop', images = '{}' WHERE id = '29f7919e-bc8b-4c5c-8211-43ca27652dff'; -- Клеммы WAGO
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&h=600&fit=crop', images = '{}' WHERE id = '2e64a9bd-2a67-4925-987d-3e45bbf13252'; -- Провод ПВС
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=600&h=600&fit=crop', images = '{}' WHERE id = '62551c97-c7fd-41d7-894f-b1384e6cbe6a'; -- Термоусадка

-- =============================================
-- КАМЕРЫ НАБЛЮДЕНИЯ (Cameras)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop', images = '{}' WHERE id = '5e67b5d2-92f3-4051-a651-fca884e4582d'; -- NVR регистратор
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop', images = '{}' WHERE id = '403e12ff-e87b-46b1-a271-b04f22122079'; -- PoE инжектор
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=600&fit=crop', images = '{}' WHERE id = '6a682130-4ae8-4d02-90bc-2aca70224ca6'; -- Камера с SD картой
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1580745294615-2a0b553d7e6a?w=600&h=600&fit=crop', images = '{}' WHERE id = '5dca490a-1c4b-4fca-bd7a-d5652f3b7d7b'; -- Купольная камера
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=600&fit=crop', images = '{}' WHERE id = '82d06609-ffa4-4fb8-a469-d20d703b6c68'; -- Мини камера Wi-Fi
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=600&fit=crop', images = '{}' WHERE id = 'aeb6a3e3-610c-4f70-b18d-0e448a0eb1d5'; -- Монитор
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=600&h=600&fit=crop', images = '{}' WHERE id = '3cb777d9-8856-4557-b5f9-9ad708c046dd'; -- Муляж камеры
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1580745294615-2a0b553d7e6a?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1580745294615-2a0b553d7e6a?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800&h=800&fit=crop'] WHERE id = '30e82e55-6428-4721-8fa3-96ace4dcd63c'; -- Уличная камера 5МП

-- =============================================
-- ОСВЕЩЕНИЕ (Lighting)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&h=600&fit=crop', images = '{}' WHERE id = '574f07d7-43fc-47a6-b7ee-0f1f58d047dc'; -- LED лампа
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=600&h=600&fit=crop', images = '{}' WHERE id = '3fa1c7fa-121d-46c3-acbf-6918bc679e9d'; -- Бра настенное
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1507473885765-e6ed057ab6fe?w=800&h=800&fit=crop'] WHERE id = '54990319-c932-48b5-9ddd-5a3f2493e53b'; -- Люстра 5 рожков
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=600&h=600&fit=crop', images = '{}' WHERE id = '441f17c1-aecd-41bf-a98a-0d0b395c0c7e'; -- Настольная лампа
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&h=600&fit=crop', images = '{}' WHERE id = '804d13ee-e2bd-4976-b833-c95208c538b6'; -- Прожектор LED
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = 'bbbe84ec-568a-42bf-9b18-dee1fba9df4b'; -- Светодиодная лента
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&h=600&fit=crop', images = '{}' WHERE id = '2761c0fe-a38d-461f-b26e-fe3af891e955'; -- Светодиодный светильник
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1565814636199-ae8133055c1c?w=600&h=600&fit=crop', images = '{}' WHERE id = '93436d04-8520-42f4-aed3-63705576c568'; -- Точечный светильник

-- =============================================
-- РОЗЕТКИ И ВЫКЛЮЧАТЕЛИ (Sockets & Switches)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = 'bec1e243-e4d5-4528-bfd7-882c4685a521'; -- Выключатель двухклавишный
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = 'ee422554-894f-4f66-b116-7d309c7d1ca7'; -- Выключатель одноклавишный
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&h=600&fit=crop', images = '{}' WHERE id = '9f0b2ea0-cbfa-4682-9a4c-06da534cafcf'; -- Датчик движения
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = '949ff23f-4b4c-4420-adbc-c68bf9341519'; -- Диммер
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = '7388bae2-be0f-4f01-ab0c-defa2fcf6367'; -- Рамка тройная
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = '9a7df737-7eff-4b76-b2fc-6d33d98ff103'; -- Розетка TV
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=800&h=800&fit=crop'] WHERE id = '798f06c5-0fd4-472f-a24a-2b3cd3af1b1f'; -- Розетка USB
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = 'ef6db7e0-5a09-4d60-a185-c6b69ae53b70'; -- Розетка двойная

-- =============================================
-- САНТЕХНИКА (Plumbing)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&h=800&fit=crop'] WHERE id = '26a94fac-72b3-4e58-91b5-a91f8bd77843'; -- Водонагреватель
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = '8b335a8b-608b-45b2-a183-aa3ca7009552'; -- Гибкая подводка
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=600&fit=crop', images = '{}' WHERE id = '5cd16f00-10e4-4979-b8e6-55ad64c71d85'; -- Раковина
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = 'b14c683a-e505-492d-b3bd-075798b3151a'; -- Сифон
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&h=800&fit=crop'] WHERE id = '46b24176-1d09-40b5-88d8-9629f3d16a90'; -- Смеситель для ванной
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = '0d838f45-9efd-4a4b-80f4-9511deff5ea0'; -- Смеситель для кухни
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = 'cb3aa554-55fb-4d20-97b4-3a2df09a79a8'; -- Труба ПВХ
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=800&fit=crop'] WHERE id = '8fb16e8e-238f-4aaf-ab44-dae9a68827de'; -- Унитаз

-- =============================================
-- СМЕСИТЕЛИ (Faucets)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = 'fc86355d-11db-461a-8d50-c11650c753aa'; -- Аэратор
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = '33d1a11b-52a9-4749-9b3c-70fe08c2c019'; -- Гигиенический душ
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = '1b9de2ac-10cf-45d8-a311-502c0e04c701'; -- Душевая стойка
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = '728d7ef1-5a1f-422d-aac6-902ffa408ef0'; -- Кран шаровой
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&h=800&fit=crop'] WHERE id = 'a50c6f0c-e51d-453f-8dc9-b7a495cbe4a6'; -- Смеситель Ванна
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = '8ddc5cdd-261d-498c-a148-39ec903da0c7'; -- Смеситель Кухня
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = '55f64e95-1a1e-41c6-8d42-29c9f454d5a5'; -- Смеситель Раковина сенсорный
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&h=600&fit=crop', images = '{}' WHERE id = '1af1057c-d841-4e12-b831-40efd9ea6aea'; -- Фильтр для воды

-- =============================================
-- ТОВАРЫ ДЛЯ РЕМОНТА (Repair Supplies)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&h=600&fit=crop', images = '{}' WHERE id = '577740cb-8073-4210-9cec-ed83e0c71c41'; -- Грунтовка
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&h=800&fit=crop'] WHERE id = '4607cae7-4172-481e-a164-b0118f974b80'; -- Краска
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&h=600&fit=crop', images = '{}' WHERE id = '1c93e256-8da8-4770-8282-3bf56bf6e94c'; -- Ламинат
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&h=600&fit=crop', images = '{}' WHERE id = 'd0070c96-0ba8-4342-b0c4-19ef99897327'; -- Обои
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&h=600&fit=crop', images = '{}' WHERE id = 'f37bd737-f830-4a0c-bf25-bc8d49cc2db0'; -- Плиточный клей
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=600&h=600&fit=crop', images = '{}' WHERE id = '54e1aeaf-1922-4424-a510-5c5535ffee4b'; -- Подложка
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&h=600&fit=crop', images = '{}' WHERE id = '9d0b9f32-f868-4632-afa9-2cc83e033395'; -- Шпаклёвка
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600&h=600&fit=crop', images = '{}' WHERE id = '0f735cf1-27b2-4c66-b556-cb76089415e3'; -- Штукатурка

-- =============================================
-- ЭЛЕКТРИКА (Electrical)
-- =============================================
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = '0149ee04-57f1-430d-ae87-2fc2738dd8cc'; -- Автомат 16А
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = '0592d638-71c6-43a1-a54b-23072a87e515'; -- Автомат 25А
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1530685932526-48ec92998eaa?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1530685932526-48ec92998eaa?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=800&fit=crop'] WHERE id = 'fe10c903-6a1d-4166-a071-55c759be7d10'; -- Генератор
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = 'e192885f-1973-44c4-a436-2288f6a9b6c8'; -- Стабилизатор
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = 'd719f6a8-0c5d-4e4b-a6e1-bbf57472f2e1'; -- Счётчик
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = '73a31f99-0c80-49cb-a223-cb94d1626fa8'; -- Удлинитель
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = '{}' WHERE id = 'caf14b11-abff-4ce3-b524-6a347c98bede'; -- УЗО
UPDATE shop_products SET image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=600&fit=crop', images = ARRAY['https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&h=800&fit=crop','https://images.unsplash.com/photo-1605810230434-7631ac76ec81?w=800&h=800&fit=crop'] WHERE id = '87cb83aa-37bc-4042-834b-36752b2066cd'; -- Электрощиток
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308101450_571b784e-c3d4-413d-81fc-033e1063062a.sql =====


-- ===== BEGIN 20260308143527_fce96627-531e-4844-a4eb-83800c492d43.sql =====


ALTER TABLE public.shop_products 
  ADD COLUMN IF NOT EXISTS promotion_start timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promotion_end timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS promotion_label text DEFAULT NULL;
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260308143527_fce96627-531e-4844-a4eb-83800c492d43.sql =====


-- ===== BEGIN 20260315061802_740b0175-f7f2-4f52-be25-5f8df7e92821.sql =====


-- Function to notify all admins about important events
CREATE OR REPLACE FUNCTION public.notify_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
  notif_related_id UUID;
BEGIN
  -- Determine notification based on table
  IF TG_TABLE_NAME = 'profiles' THEN
    notif_title := 'Новый пользователь';
    notif_message := 'Зарегистрировался новый пользователь: ' || COALESCE(NEW.full_name, 'Без имени');
    notif_type := 'new_user';
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'master_applications' THEN
    notif_title := 'Новая заявка мастера';
    notif_message := 'Получена заявка от ' || COALESCE(NEW.full_name, 'Без имени') || ' (' || COALESCE(NEW.specialization, '') || ')';
    notif_type := 'new_application';
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'orders' THEN
    notif_title := 'Новый заказ';
    notif_message := 'Создан новый заказ по адресу: ' || COALESCE(NEW.address, '—');
    notif_type := 'new_order';
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'reviews' THEN
    notif_title := 'Новый отзыв';
    notif_message := 'Получен новый отзыв с оценкой ' || NEW.rating || '/5';
    notif_type := 'new_review';
    notif_related_id := NEW.id;
  END IF;

  -- Send to all admins and super_admins
  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (admin_record.user_id, notif_title, notif_message, notif_type, notif_related_id);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger: notify admins on new user registration
CREATE TRIGGER on_new_user_notify_admins
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins();

-- Trigger: notify admins on new master application
CREATE TRIGGER on_new_application_notify_admins
  AFTER INSERT ON public.master_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins();

-- Trigger: notify admins on new order
CREATE TRIGGER on_new_order_notify_admins
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins();

-- Trigger: notify admins on new review
CREATE TRIGGER on_new_review_notify_admins
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admins();
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260315061802_740b0175-f7f2-4f52-be25-5f8df7e92821.sql =====


-- ===== BEGIN 20260316102632_7fafc7f3-2bbe-45a3-858d-762878dfd428.sql =====


-- Favorites table
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL, -- 'master', 'service', 'product'
  item_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own favorites" ON public.favorites FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Promo codes table
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value numeric NOT NULL DEFAULT 0,
  expires_at timestamptz,
  usage_limit integer DEFAULT NULL,
  times_used integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active promo codes" ON public.promo_codes FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Admins manage promo codes" ON public.promo_codes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Promo code usage tracking
CREATE TABLE public.promo_code_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id),
  user_id uuid NOT NULL,
  order_id uuid,
  discount_applied numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(promo_code_id, user_id)
);
ALTER TABLE public.promo_code_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own usage" ON public.promo_code_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own usage" ON public.promo_code_usage FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view all usage" ON public.promo_code_usage FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  category text NOT NULL, -- 'master_issue', 'order_issue', 'product_issue', 'refund', 'other'
  subject text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  admin_response text,
  related_order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Activity logs table (super admin only)
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  actor_id uuid,
  actor_name text DEFAULT '',
  entity_type text, -- 'user', 'order', 'application', 'review', 'product'
  entity_id uuid,
  details text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins view logs" ON public.activity_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "System can insert logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Admins can insert logs" ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

-- Activity log trigger function
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_action TEXT;
  log_entity_type TEXT;
  log_details TEXT;
  log_actor_name TEXT;
BEGIN
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'INSERT' THEN
    log_action := 'user_registered';
    log_entity_type := 'user';
    log_details := 'Новый пользователь: ' || COALESCE(NEW.full_name, '');
    log_actor_name := COALESCE(NEW.full_name, '');
  ELSIF TG_TABLE_NAME = 'master_applications' AND TG_OP = 'INSERT' THEN
    log_action := 'master_application_submitted';
    log_entity_type := 'application';
    log_details := 'Заявка от ' || COALESCE(NEW.full_name, '') || ' (' || COALESCE(NEW.specialization, '') || ')';
    log_actor_name := COALESCE(NEW.full_name, '');
  ELSIF TG_TABLE_NAME = 'master_applications' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
      log_action := 'master_approved';
      log_entity_type := 'application';
      log_details := 'Заявка одобрена: ' || COALESCE(NEW.full_name, '');
      log_actor_name := COALESCE(NEW.full_name, '');
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
      log_action := 'master_rejected';
      log_entity_type := 'application';
      log_details := 'Заявка отклонена: ' || COALESCE(NEW.full_name, '');
      log_actor_name := COALESCE(NEW.full_name, '');
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'orders' AND TG_OP = 'INSERT' THEN
    log_action := 'order_created';
    log_entity_type := 'order';
    log_details := 'Новый заказ по адресу: ' || COALESCE(NEW.address, '—');
    log_actor_name := '';
  ELSIF TG_TABLE_NAME = 'orders' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      log_action := 'order_completed';
      log_entity_type := 'order';
      log_details := 'Заказ завершён';
      log_actor_name := '';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'reviews' AND TG_OP = 'INSERT' THEN
    log_action := 'review_submitted';
    log_entity_type := 'review';
    log_details := 'Новый отзыв с оценкой ' || NEW.rating || '/5';
    log_actor_name := '';
  ELSIF TG_TABLE_NAME = 'shop_products' AND TG_OP = 'INSERT' THEN
    log_action := 'product_added';
    log_entity_type := 'product';
    log_details := 'Новый товар: ' || COALESCE(NEW.name, '');
    log_actor_name := '';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.activity_logs (action, actor_id, actor_name, entity_type, entity_id, details)
  VALUES (log_action, COALESCE(NEW.user_id, NEW.client_id, NULL), log_actor_name, log_entity_type, NEW.id, log_details);

  RETURN NEW;
END;
$$;

-- Attach activity log triggers
CREATE TRIGGER log_profile_activity AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_application_activity AFTER INSERT OR UPDATE ON public.master_applications FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_order_activity AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_review_activity AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER log_product_activity AFTER INSERT ON public.shop_products FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- Attach notify_admins triggers (were missing)
CREATE TRIGGER notify_on_profile AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_admins();
CREATE TRIGGER notify_on_application AFTER INSERT ON public.master_applications FOR EACH ROW EXECUTE FUNCTION public.notify_admins();
CREATE TRIGGER notify_on_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_admins();
CREATE TRIGGER notify_on_review AFTER INSERT ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.notify_admins();

-- Support ticket notification trigger
CREATE OR REPLACE FUNCTION public.notify_admins_support()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE admin_record RECORD;
BEGIN
  FOR admin_record IN SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'super_admin')
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (admin_record.user_id, 'Новое обращение в поддержку', 'Получено обращение: ' || COALESCE(NEW.subject, ''), 'support_ticket', NEW.id);
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_on_support_ticket AFTER INSERT ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.notify_admins_support();
-- Миграция Supabase: изменение схемы базы данных для функциональности проекта.

-- ===== END 20260316102632_7fafc7f3-2bbe-45a3-858d-762878dfd428.sql =====


-- ===== BEGIN 20260405103000_harden_signup_triggers.sql =====

-- Делает триггеры уведомлений и журнала активности безопасными, чтобы они не ломали регистрацию нового пользователя.

CREATE OR REPLACE FUNCTION public.notify_admins()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
  notif_related_id UUID;
BEGIN
  IF to_regclass('public.notifications') IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'profiles' THEN
    notif_title := 'Новый пользователь';
    notif_message := 'Зарегистрировался новый пользователь: ' || COALESCE(NEW.full_name, 'Без имени');
    notif_type := 'new_user';
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'master_applications' THEN
    notif_title := 'Новая заявка мастера';
    notif_message := 'Получена заявка от ' || COALESCE(NEW.full_name, 'Без имени') || ' (' || COALESCE(NEW.specialization, '') || ')';
    notif_type := 'new_application';
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'orders' THEN
    notif_title := 'Новый заказ';
    notif_message := 'Создан новый заказ по адресу: ' || COALESCE(NEW.address, '—');
    notif_type := 'new_order';
    notif_related_id := NEW.id;
  ELSIF TG_TABLE_NAME = 'reviews' THEN
    notif_title := 'Новый отзыв';
    notif_message := 'Получен новый отзыв с оценкой ' || NEW.rating || '/5';
    notif_type := 'new_review';
    notif_related_id := NEW.id;
  ELSE
    RETURN NEW;
  END IF;

  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role IN ('admin', 'super_admin')
  LOOP
    BEGIN
      INSERT INTO public.notifications (user_id, title, message, type, related_id)
      VALUES (admin_record.user_id, notif_title, notif_message, notif_type, notif_related_id);
    EXCEPTION
      WHEN OTHERS THEN
        CONTINUE;
    END;
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  log_action TEXT;
  log_entity_type TEXT;
  log_details TEXT;
  log_actor_name TEXT;
BEGIN
  IF to_regclass('public.activity_logs') IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'INSERT' THEN
    log_action := 'user_registered';
    log_entity_type := 'user';
    log_details := 'Новый пользователь: ' || COALESCE(NEW.full_name, '');
    log_actor_name := COALESCE(NEW.full_name, '');
  ELSIF TG_TABLE_NAME = 'master_applications' AND TG_OP = 'INSERT' THEN
    log_action := 'master_application_submitted';
    log_entity_type := 'application';
    log_details := 'Заявка от ' || COALESCE(NEW.full_name, '') || ' (' || COALESCE(NEW.specialization, '') || ')';
    log_actor_name := COALESCE(NEW.full_name, '');
  ELSIF TG_TABLE_NAME = 'master_applications' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
      log_action := 'master_approved';
      log_entity_type := 'application';
      log_details := 'Заявка одобрена: ' || COALESCE(NEW.full_name, '');
      log_actor_name := COALESCE(NEW.full_name, '');
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
      log_action := 'master_rejected';
      log_entity_type := 'application';
      log_details := 'Заявка отклонена: ' || COALESCE(NEW.full_name, '');
      log_actor_name := COALESCE(NEW.full_name, '');
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'orders' AND TG_OP = 'INSERT' THEN
    log_action := 'order_created';
    log_entity_type := 'order';
    log_details := 'Новый заказ по адресу: ' || COALESCE(NEW.address, '—');
    log_actor_name := '';
  ELSIF TG_TABLE_NAME = 'orders' AND TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
      log_action := 'order_completed';
      log_entity_type := 'order';
      log_details := 'Заказ завершён';
      log_actor_name := '';
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_TABLE_NAME = 'reviews' AND TG_OP = 'INSERT' THEN
    log_action := 'review_submitted';
    log_entity_type := 'review';
    log_details := 'Новый отзыв с оценкой ' || NEW.rating || '/5';
    log_actor_name := '';
  ELSIF TG_TABLE_NAME = 'shop_products' AND TG_OP = 'INSERT' THEN
    log_action := 'product_added';
    log_entity_type := 'product';
    log_details := 'Новый товар: ' || COALESCE(NEW.name, '');
    log_actor_name := '';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO public.activity_logs (action, actor_id, actor_name, entity_type, entity_id, details)
  VALUES (log_action, COALESCE(NEW.user_id, NEW.client_id, NULL), log_actor_name, log_entity_type, NEW.id, log_details);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ===== END 20260405103000_harden_signup_triggers.sql =====



-- ===== BEGIN 20260405114500_enrich_shop_product_data.sql =====
-- Enrich shop catalog with stock, promotion labels, richer image galleries and practical specs.
UPDATE public.shop_products
SET
  images = CASE
    WHEN coalesce(array_length(images, 1), 0) = 0 AND image_url IS NOT NULL THEN ARRAY[image_url]
    ELSE images
  END,
  stock_qty = CASE
    WHEN name IN ('Кондиционер 12000', 'Стиральная машина', 'Комплект 4 камеры', 'Электронный замок', 'Водонагреватель', 'Унитаз', 'Генератор') THEN 6
    WHEN name IN ('Кондиционер 9000', 'Газовая плита', 'Микроволновая печь', 'Обогреватель', 'Пылесос', 'Раковина', 'Стабилизатор') THEN 9
    WHEN name ILIKE '%камера%' OR name IN ('NVR регистратор', 'PoE инжектор', 'Монитор', 'Видеорегистратор', 'Домофон', 'Жёсткий диск', 'Блок питания') THEN 11
    WHEN name ILIKE '%замок%' OR name ILIKE '%ручка%' OR name ILIKE '%петли%' OR name ILIKE '%глазок%' OR name ILIKE '%доводчик%' OR name ILIKE '%цилиндр%' THEN 14
    WHEN name ILIKE '%кабель%' OR name ILIKE '%провод%' OR name ILIKE '%гофротруба%' OR name ILIKE '%изолента%' OR name ILIKE '%термоусадка%' OR name ILIKE '%клеммы%' THEN 36
    WHEN name ILIKE '%лампа%' OR name ILIKE '%светильник%' OR name ILIKE '%прожектор%' OR name ILIKE '%лента%' OR name ILIKE '%люстра%' OR name ILIKE '%бра%' THEN 22
    WHEN name ILIKE '%розетка%' OR name ILIKE '%выключатель%' OR name ILIKE '%диммер%' OR name ILIKE '%датчик%' OR name ILIKE '%рамка%' OR name ILIKE '%автомат%' OR name ILIKE '%узо%' OR name ILIKE '%электрощиток%' OR name ILIKE '%счётчик%' OR name ILIKE '%удлинитель%' THEN 20
    WHEN name ILIKE '%смеситель%' OR name ILIKE '%сифон%' OR name ILIKE '%подводка%' OR name ILIKE '%труба%' OR name ILIKE '%кран%' OR name ILIKE '%аэратор%' OR name ILIKE '%душ%' OR name ILIKE '%фильтр%' THEN 18
    WHEN name ILIKE '%краска%' OR name ILIKE '%грунтовка%' OR name ILIKE '%ламинат%' OR name ILIKE '%обои%' OR name ILIKE '%клей%' OR name ILIKE '%подложка%' OR name ILIKE '%шпакл%' OR name ILIKE '%штукатур%' THEN 28
    WHEN name ILIKE '%болгарка%' OR name ILIKE '%уровень%' OR name ILIKE '%ключей%' OR name ILIKE '%отвёрток%' OR name ILIKE '%перфоратор%' OR name ILIKE '%рулетка%' OR name ILIKE '%шурупов%' OR name ILIKE '%электролобзик%' THEN 12
    ELSE COALESCE(stock_qty, 15)
  END,
  promotion_label = CASE
    WHEN is_discounted IS TRUE THEN 'Скидка недели'
    WHEN is_popular IS TRUE THEN 'Хит продаж'
    WHEN installation_price IS NOT NULL THEN 'С установкой'
    ELSE promotion_label
  END,
  specs = CASE
    WHEN name = 'Вентилятор напольный' THEN jsonb_build_object('Бренд', 'Vitek', 'Мощность', '45 Вт', 'Размер', '16"', 'Материал', 'пластик')
    WHEN name = 'Газовая плита' THEN jsonb_build_object('Бренд', 'Artel', 'Мощность', '4 конфорки', 'Размер', '60 см', 'Материал', 'эмалированная сталь')
    WHEN name = 'Кондиционер 12000' THEN jsonb_build_object('Бренд', 'Midea', 'Мощность', '12000 BTU', 'Размер', 'до 35 м2', 'Материал', 'ABS-пластик')
    WHEN name = 'Кондиционер 9000' THEN jsonb_build_object('Бренд', 'Gree', 'Мощность', '9000 BTU', 'Размер', 'до 25 м2', 'Материал', 'ABS-пластик')
    WHEN name = 'Микроволновая печь' THEN jsonb_build_object('Бренд', 'Samsung', 'Мощность', '800 Вт', 'Размер', '20 л', 'Материал', 'металл')
    WHEN name = 'Обогреватель' THEN jsonb_build_object('Бренд', 'Ziffler', 'Мощность', '2000 Вт', 'Размер', 'напольный', 'Материал', 'металл')
    WHEN name = 'Пылесос' THEN jsonb_build_object('Бренд', 'LG', 'Мощность', '1800 Вт', 'Размер', '3 л', 'Материал', 'пластик')
    WHEN name = 'Стиральная машина' THEN jsonb_build_object('Бренд', 'Samsung', 'Мощность', '7 кг', 'Размер', '60 см', 'Материал', 'металл')
    WHEN name = 'IP камера 4МП' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '4 МП', 'Размер', 'уличная', 'Материал', 'металл')
    WHEN name = 'PTZ камера' THEN jsonb_build_object('Бренд', 'Dahua', 'Мощность', '2 МП', 'Размер', 'PTZ', 'Материал', 'металл')
    WHEN name = 'Блок питания' THEN jsonb_build_object('Бренд', 'Mean Well', 'Мощность', '12V / 5A', 'Размер', 'компактный', 'Материал', 'металл')
    WHEN name = 'Видеорегистратор' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '8 каналов', 'Размер', '1080p', 'Материал', 'металл')
    WHEN name = 'Домофон' THEN jsonb_build_object('Бренд', 'Commax', 'Мощность', '7"', 'Размер', 'внутренний блок', 'Материал', 'пластик')
    WHEN name = 'Жёсткий диск' THEN jsonb_build_object('Бренд', 'WD Purple', 'Мощность', '1 ТБ', 'Размер', '3.5"', 'Материал', 'металл')
    WHEN name = 'Кабель UTP' THEN jsonb_build_object('Бренд', 'Netlan', 'Мощность', 'Cat 5e', 'Размер', '305 м', 'Материал', 'медь')
    WHEN name = 'Комплект 4 камеры' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '4 камеры', 'Размер', '4 МП', 'Материал', 'металл')
    WHEN name = 'Глазок дверной' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', '180° обзор', 'Размер', '14 мм', 'Материал', 'латунь')
    WHEN name = 'Дверная ручка' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', 'межкомнатная', 'Размер', 'универсальная', 'Материал', 'сталь')
    WHEN name = 'Доводчик' THEN jsonb_build_object('Бренд', 'Dorma', 'Мощность', 'до 60 кг', 'Размер', 'стандарт', 'Материал', 'металл')
    WHEN name = 'Замок врезной' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', 'врезной', 'Размер', '85 мм', 'Материал', 'сталь')
    WHEN name = 'Навесной замок' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', 'навесной', 'Размер', '50 мм', 'Материал', 'сталь')
    WHEN name = 'Петли' THEN jsonb_build_object('Бренд', 'Palladium', 'Мощность', '2 шт', 'Размер', '100 мм', 'Материал', 'сталь')
    WHEN name = 'Цилиндр замка' THEN jsonb_build_object('Бренд', 'Apecs', 'Мощность', 'ключ-ключ', 'Размер', '70 мм', 'Материал', 'латунь')
    WHEN name = 'Электронный замок' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', 'электронный', 'Размер', 'универсальный', 'Материал', 'алюминий')
    WHEN name = 'Болгарка' THEN jsonb_build_object('Бренд', 'Makita', 'Мощность', '850 Вт', 'Размер', '125 мм', 'Материал', 'металл')
    WHEN name = 'Лазерный уровень' THEN jsonb_build_object('Бренд', 'Bosch', 'Мощность', '2 линии', 'Размер', '15 м', 'Материал', 'пластик')
    WHEN name = 'Набор ключей' THEN jsonb_build_object('Бренд', 'Tolsen', 'Мощность', '12 предметов', 'Размер', '8-22 мм', 'Материал', 'хром-ванадий')
    WHEN name = 'Набор отвёрток' THEN jsonb_build_object('Бренд', 'Stanley', 'Мощность', '6 предметов', 'Размер', 'PH/SL', 'Материал', 'хром-ванадий')
    WHEN name = 'Перфоратор' THEN jsonb_build_object('Бренд', 'DeWalt', 'Мощность', '800 Вт', 'Размер', 'SDS Plus', 'Материал', 'металл')
    WHEN name = 'Рулетка' THEN jsonb_build_object('Бренд', 'Stanley', 'Мощность', '5 м', 'Размер', '19 мм', 'Материал', 'пластик')
    WHEN name = 'Шуруповёрт' THEN jsonb_build_object('Бренд', 'Makita', 'Мощность', '18 В', 'Размер', '2 АКБ', 'Материал', 'пластик')
    WHEN name = 'Электролобзик' THEN jsonb_build_object('Бренд', 'Bosch', 'Мощность', '650 Вт', 'Размер', 'ход 20 мм', 'Материал', 'металл')
    WHEN name = 'Гофротруба' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', 'защитная', 'Размер', '20 мм', 'Материал', 'ПВХ')
    WHEN name = 'Изолента' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '0.13 мм', 'Размер', '19 мм', 'Материал', 'ПВХ')
    WHEN name = 'Кабель ВВГ 2x1.5' THEN jsonb_build_object('Бренд', 'Кавказкабель', 'Мощность', '2x1.5', 'Размер', '100 м', 'Материал', 'медь')
    WHEN name = 'Кабель ВВГ 3x2.5' THEN jsonb_build_object('Бренд', 'Кавказкабель', 'Мощность', '3x2.5', 'Размер', '100 м', 'Материал', 'медь')
    WHEN name = 'Кабель-канал' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', 'настенный', 'Размер', '25x16 мм', 'Материал', 'ПВХ')
    WHEN name = 'Клеммы WAGO' THEN jsonb_build_object('Бренд', 'WAGO', 'Мощность', '5 контактов', 'Размер', '221 серия', 'Материал', 'пластик')
    WHEN name = 'Провод ПВС' THEN jsonb_build_object('Бренд', 'Кавказкабель', 'Мощность', '2x0.75', 'Размер', '50 м', 'Материал', 'медь')
    WHEN name = 'Термоусадка' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', 'набор', 'Размер', '2-10 мм', 'Материал', 'полиолефин')
    WHEN name = 'NVR регистратор' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '8 каналов', 'Размер', '4K', 'Материал', 'металл')
    WHEN name = 'PoE инжектор' THEN jsonb_build_object('Бренд', 'Ubiquiti', 'Мощность', '48V', 'Размер', '1 порт', 'Материал', 'пластик')
    WHEN name = 'Камера с SD картой' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', '2 МП', 'Размер', 'microSD', 'Материал', 'пластик')
    WHEN name = 'Купольная камера' THEN jsonb_build_object('Бренд', 'Dahua', 'Мощность', '2 МП', 'Размер', 'купольная', 'Материал', 'металл')
    WHEN name = 'Мини камера Wi-Fi' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', '1080p', 'Размер', 'Wi-Fi', 'Материал', 'пластик')
    WHEN name = 'Монитор' THEN jsonb_build_object('Бренд', 'Dahua', 'Мощность', '10"', 'Размер', 'для CCTV', 'Материал', 'пластик')
    WHEN name = 'Муляж камеры' THEN jsonb_build_object('Бренд', 'NoName', 'Мощность', 'муляж', 'Размер', 'уличный', 'Материал', 'пластик')
    WHEN name = 'Уличная камера 5МП' THEN jsonb_build_object('Бренд', 'Hikvision', 'Мощность', '5 МП', 'Размер', 'уличная', 'Материал', 'металл')
    WHEN name = 'LED лампа' THEN jsonb_build_object('Бренд', 'Philips', 'Мощность', '12 Вт', 'Размер', 'E27', 'Материал', 'пластик')
    WHEN name = 'Бра настенное' THEN jsonb_build_object('Бренд', 'Eurosvet', 'Мощность', '1 плафон', 'Размер', 'настенное', 'Материал', 'металл')
    WHEN name = 'Люстра 5 рожков' THEN jsonb_build_object('Бренд', 'Eurosvet', 'Мощность', '5x40 Вт', 'Размер', '5 рожков', 'Материал', 'металл')
    WHEN name = 'Настольная лампа' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', '10 Вт', 'Размер', 'настольная', 'Материал', 'пластик')
    WHEN name = 'Прожектор LED' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '50 Вт', 'Размер', 'IP65', 'Материал', 'алюминий')
    WHEN name = 'Светодиодная лента' THEN jsonb_build_object('Бренд', 'Arlight', 'Мощность', '12 В', 'Размер', '5 м', 'Материал', 'силикон')
    WHEN name = 'Светодиодный светильник' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '36 Вт', 'Размер', '600 мм', 'Материал', 'алюминий')
    WHEN name = 'Точечный светильник' THEN jsonb_build_object('Бренд', 'Gauss', 'Мощность', '7 Вт', 'Размер', '90 мм', 'Материал', 'алюминий')
    WHEN name = 'Выключатель двухклавишный' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '10 А', 'Размер', '2 клавиши', 'Материал', 'пластик')
    WHEN name = 'Выключатель одноклавишный' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '10 А', 'Размер', '1 клавиша', 'Материал', 'пластик')
    WHEN name = 'Датчик движения' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '1200 Вт', 'Размер', '180°', 'Материал', 'пластик')
    WHEN name = 'Диммер' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '600 Вт', 'Размер', 'поворотный', 'Материал', 'пластик')
    WHEN name = 'Рамка тройная' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '3 поста', 'Размер', '86 мм', 'Материал', 'пластик')
    WHEN name = 'Розетка TV' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', 'TV', 'Размер', 'внутренняя', 'Материал', 'пластик')
    WHEN name = 'Розетка USB' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', 'USB 2.1A', 'Размер', 'внутренняя', 'Материал', 'пластик')
    WHEN name = 'Розетка двойная' THEN jsonb_build_object('Бренд', 'Legrand', 'Мощность', '16 А', 'Размер', 'двойная', 'Материал', 'пластик')
    WHEN name = 'Водонагреватель' THEN jsonb_build_object('Бренд', 'Ariston', 'Мощность', '80 л', 'Размер', '2000 Вт', 'Материал', 'эмалированная сталь')
    WHEN name = 'Гибкая подводка' THEN jsonb_build_object('Бренд', 'AquaLine', 'Мощность', '1/2"', 'Размер', '60 см', 'Материал', 'нержавеющая сталь')
    WHEN name = 'Раковина' THEN jsonb_build_object('Бренд', 'Cersanit', 'Мощность', 'подвесная', 'Размер', '55 см', 'Материал', 'керамика')
    WHEN name = 'Сифон' THEN jsonb_build_object('Бренд', 'AniPlast', 'Мощность', 'бутылочный', 'Размер', '1 1/2"', 'Материал', 'ПВХ')
    WHEN name = 'Смеситель для ванной' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'однорычажный', 'Размер', 'короткий излив', 'Материал', 'латунь')
    WHEN name = 'Смеситель для кухни' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'однорычажный', 'Размер', 'высокий излив', 'Материал', 'латунь')
    WHEN name = 'Труба ПВХ' THEN jsonb_build_object('Бренд', 'Valfex', 'Мощность', 'канализационная', 'Размер', '50 мм', 'Материал', 'ПВХ')
    WHEN name = 'Унитаз' THEN jsonb_build_object('Бренд', 'Cersanit', 'Мощность', 'напольный', 'Размер', 'компакт', 'Материал', 'керамика')
    WHEN name = 'Аэратор' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'антиразбрызгивание', 'Размер', 'M24', 'Материал', 'латунь')
    WHEN name = 'Гигиенический душ' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'комплект', 'Размер', '1/2"', 'Материал', 'латунь')
    WHEN name = 'Душевая стойка' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'верхний душ', 'Размер', '90 см', 'Материал', 'нержавеющая сталь')
    WHEN name = 'Кран шаровой' THEN jsonb_build_object('Бренд', 'Bugatti', 'Мощность', '1/2"', 'Размер', 'стандарт', 'Материал', 'латунь')
    WHEN name = 'Смеситель Ванна' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'однорычажный', 'Размер', 'для ванны', 'Материал', 'латунь')
    WHEN name = 'Смеситель Кухня' THEN jsonb_build_object('Бренд', 'Grohe', 'Мощность', 'однорычажный', 'Размер', 'для кухни', 'Материал', 'латунь')
    WHEN name = 'Смеситель Раковина сенсорный' THEN jsonb_build_object('Бренд', 'Xiaomi', 'Мощность', 'сенсорный', 'Размер', 'для раковины', 'Материал', 'латунь')
    WHEN name = 'Фильтр для воды' THEN jsonb_build_object('Бренд', 'Aquaphor', 'Мощность', '3 ступени', 'Размер', 'под мойку', 'Материал', 'пластик')
    WHEN name = 'Грунтовка' THEN jsonb_build_object('Бренд', 'Knauf', 'Мощность', 'глубокого проникновения', 'Размер', '10 л', 'Материал', 'акрил')
    WHEN name = 'Краска' THEN jsonb_build_object('Бренд', 'Tikkurila', 'Мощность', 'интерьерная', 'Размер', '10 кг', 'Материал', 'акрил')
    WHEN name = 'Ламинат' THEN jsonb_build_object('Бренд', 'Kronospan', 'Мощность', '32 класс', 'Размер', '8 мм', 'Материал', 'HDF')
    WHEN name = 'Обои' THEN jsonb_build_object('Бренд', 'Erismann', 'Мощность', 'виниловые', 'Размер', '1.06 м', 'Материал', 'винил')
    WHEN name = 'Плиточный клей' THEN jsonb_build_object('Бренд', 'Ceresit', 'Мощность', 'для плитки', 'Размер', '25 кг', 'Материал', 'цемент')
    WHEN name = 'Подложка' THEN jsonb_build_object('Бренд', 'Solid', 'Мощность', 'под ламинат', 'Размер', '3 мм', 'Материал', 'пенополиэтилен')
    WHEN name = 'Шпаклёвка' THEN jsonb_build_object('Бренд', 'Knauf', 'Мощность', 'финишная', 'Размер', '20 кг', 'Материал', 'гипс')
    WHEN name = 'Штукатурка' THEN jsonb_build_object('Бренд', 'Knauf', 'Мощность', 'гипсовая', 'Размер', '30 кг', 'Материал', 'гипс')
    WHEN name = 'Автомат 16А' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '16 А', 'Размер', '1P', 'Материал', 'пластик')
    WHEN name = 'Автомат 25А' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '25 А', 'Размер', '1P', 'Материал', 'пластик')
    WHEN name = 'Генератор' THEN jsonb_build_object('Бренд', 'Huter', 'Мощность', '3 кВт', 'Размер', 'бензиновый', 'Материал', 'металл')
    WHEN name = 'Стабилизатор' THEN jsonb_build_object('Бренд', 'Ресанта', 'Мощность', '5 кВт', 'Размер', 'настенный', 'Материал', 'металл')
    WHEN name = 'Счётчик' THEN jsonb_build_object('Бренд', 'Энергомера', 'Мощность', 'однофазный', 'Размер', '220 В', 'Материал', 'пластик')
    WHEN name = 'Удлинитель' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '16 А', 'Размер', '5 м', 'Материал', 'пластик')
    WHEN name = 'УЗО' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '25 А', 'Размер', '30 мА', 'Материал', 'пластик')
    WHEN name = 'Электрощиток' THEN jsonb_build_object('Бренд', 'IEK', 'Мощность', '12 модулей', 'Размер', 'навесной', 'Материал', 'металл')
    ELSE COALESCE(specs, '{}'::jsonb)
  END;

-- ===== END 20260405114500_enrich_shop_product_data.sql =====



-- ===== BEGIN 20260405123000_add_shop_product_reviews.sql =====
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

-- ===== END 20260405123000_add_shop_product_reviews.sql =====


-- 20260405133000_add_shop_checkout_fields.sql
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

-- 20260405143000_shop_order_timeline_and_notifications.sql
CREATE TABLE IF NOT EXISTS public.shop_order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  status text NOT NULL,
  note text,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_order_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own shop order history" ON public.shop_order_status_history;
CREATE POLICY "Users view own shop order history"
ON public.shop_order_status_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.shop_orders
    WHERE shop_orders.id = shop_order_status_history.order_id
      AND shop_orders.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins manage shop order history" ON public.shop_order_status_history;
CREATE POLICY "Admins manage shop order history"
ON public.shop_order_status_history
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "Users cancel own pending shop orders" ON public.shop_orders;
CREATE POLICY "Users cancel own pending shop orders"
ON public.shop_orders
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id AND status = 'cancelled');

CREATE OR REPLACE FUNCTION public.shop_order_status_label(input_status text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE input_status
    WHEN 'pending' THEN '����� ������'
    WHEN 'confirmed' THEN '����� �����������'
    WHEN 'processing' THEN '����� ����������'
    WHEN 'shipped' THEN '����� � ����'
    WHEN 'delivered' THEN '����� ���������'
    WHEN 'completed' THEN '����� ��������'
    WHEN 'cancelled' THEN '����� �������'
    ELSE COALESCE(input_status, '������ ��������')
  END;
$$;

CREATE OR REPLACE FUNCTION public.handle_shop_order_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  status_title text;
  payment_title text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.shop_order_status_history (order_id, status, note, changed_by)
    VALUES (NEW.id, NEW.status, '����� �������� ��������', NEW.user_id);

    FOR admin_record IN
      SELECT user_id
      FROM public.user_roles
      WHERE role IN ('admin', 'super_admin')
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, related_id)
      VALUES (
        admin_record.user_id,
        '����� ����� ��������',
        '�������� ����� #' || substring(NEW.id::text, 1, 8) || ' �� ����� ' || NEW.total || ' �����?',
        'shop_order_admin',
        NEW.id
      );
    END LOOP;

    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.user_id,
      '����� ������',
      '��� ����� #' || substring(NEW.id::text, 1, 8) || ' ������ � ������� �������������',
      'shop_order',
      NEW.id
    );

    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    status_title := public.shop_order_status_label(NEW.status);

    INSERT INTO public.shop_order_status_history (order_id, status, note, changed_by)
    VALUES (NEW.id, NEW.status, status_title, auth.uid());

    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.user_id,
      '������ ������ ��������',
      '����� #' || substring(NEW.id::text, 1, 8) || ': ' || status_title,
      'shop_order',
      NEW.id
    );

    FOR admin_record IN
      SELECT user_id
      FROM public.user_roles
      WHERE role IN ('admin', 'super_admin')
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, related_id)
      VALUES (
        admin_record.user_id,
        '������ ������ �������',
        '����� #' || substring(NEW.id::text, 1, 8) || ': ' || status_title,
        'shop_order_admin',
        NEW.id
      );
    END LOOP;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    payment_title := CASE NEW.payment_status
      WHEN 'paid' THEN '������ ��������'
      WHEN 'pending' THEN '��������� ������'
      WHEN 'failed' THEN '������ ������'
      ELSE '������ ������ ��������'
    END;

    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.user_id,
      payment_title,
      '����� #' || substring(NEW.id::text, 1, 8) || ': ' || payment_title,
      'shop_payment',
      NEW.id
    );

    FOR admin_record IN
      SELECT user_id
      FROM public.user_roles
      WHERE role IN ('admin', 'super_admin')
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, related_id)
      VALUES (
        admin_record.user_id,
        '������ ������ ���������',
        '����� #' || substring(NEW.id::text, 1, 8) || ': ' || payment_title,
        'shop_payment_admin',
        NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_shop_order_events_trigger ON public.shop_orders;
CREATE TRIGGER handle_shop_order_events_trigger
AFTER INSERT OR UPDATE ON public.shop_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_shop_order_events();
