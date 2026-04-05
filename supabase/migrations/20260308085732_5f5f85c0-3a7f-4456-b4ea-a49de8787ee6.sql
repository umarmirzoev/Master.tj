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
