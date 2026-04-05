
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
