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
    WHEN 'pending' THEN 'Заказ создан'
    WHEN 'confirmed' THEN 'Заказ подтвержден'
    WHEN 'processing' THEN 'Заказ собирается'
    WHEN 'shipped' THEN 'Заказ в пути'
    WHEN 'delivered' THEN 'Заказ доставлен'
    WHEN 'completed' THEN 'Заказ завершен'
    WHEN 'cancelled' THEN 'Заказ отменен'
    ELSE COALESCE(input_status, 'Статус обновлен')
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
    VALUES (NEW.id, NEW.status, 'Заказ оформлен клиентом', NEW.user_id);

    FOR admin_record IN
      SELECT user_id
      FROM public.user_roles
      WHERE role IN ('admin', 'super_admin')
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, related_id)
      VALUES (
        admin_record.user_id,
        'Новый заказ магазина',
        'Поступил заказ #' || substring(NEW.id::text, 1, 8) || ' на сумму ' || NEW.total || ' сомонӣ',
        'shop_order_admin',
        NEW.id
      );
    END LOOP;

    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.user_id,
      'Заказ принят',
      'Ваш заказ #' || substring(NEW.id::text, 1, 8) || ' создан и ожидает подтверждения',
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
      'Статус заказа обновлен',
      'Заказ #' || substring(NEW.id::text, 1, 8) || ': ' || status_title,
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
        'Статус заказа изменен',
        'Заказ #' || substring(NEW.id::text, 1, 8) || ': ' || status_title,
        'shop_order_admin',
        NEW.id
      );
    END LOOP;
  END IF;

  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status THEN
    payment_title := CASE NEW.payment_status
      WHEN 'paid' THEN 'Оплата получена'
      WHEN 'pending' THEN 'Ожидается оплата'
      WHEN 'failed' THEN 'Ошибка оплаты'
      ELSE 'Статус оплаты обновлен'
    END;

    INSERT INTO public.notifications (user_id, title, message, type, related_id)
    VALUES (
      NEW.user_id,
      payment_title,
      'Заказ #' || substring(NEW.id::text, 1, 8) || ': ' || payment_title,
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
        'Оплата заказа обновлена',
        'Заказ #' || substring(NEW.id::text, 1, 8) || ': ' || payment_title,
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
