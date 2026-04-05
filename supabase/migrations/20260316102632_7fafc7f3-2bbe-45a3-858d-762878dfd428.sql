
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
