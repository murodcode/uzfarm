
-- Fix: "Anyone can view tasks" is RESTRICTIVE which blocks non-admin users
-- Drop and recreate as PERMISSIVE
DROP POLICY IF EXISTS "Anyone can view tasks" ON public.game_tasks;
CREATE POLICY "Anyone can view tasks"
ON public.game_tasks
FOR SELECT
USING (true);

-- Also fix admin policy to be PERMISSIVE
DROP POLICY IF EXISTS "Admins can manage tasks" ON public.game_tasks;
CREATE POLICY "Admins can manage tasks"
ON public.game_tasks
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
