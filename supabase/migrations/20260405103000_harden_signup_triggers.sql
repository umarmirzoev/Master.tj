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
