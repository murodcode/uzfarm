
-- Drop existing RESTRICTIVE policies on game_tasks
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.game_tasks;
DROP POLICY IF EXISTS "Anyone can view tasks" ON public.game_tasks;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Anyone can view tasks"
ON public.game_tasks
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage tasks"
ON public.game_tasks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
