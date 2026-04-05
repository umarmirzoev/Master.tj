
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
