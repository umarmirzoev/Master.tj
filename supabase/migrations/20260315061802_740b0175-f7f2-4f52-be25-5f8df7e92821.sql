
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
