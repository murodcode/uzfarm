
-- Add is_blocked to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

-- Add ad_views counter to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ad_views integer NOT NULL DEFAULT 0;

-- Add url column to game_tasks for links (e.g. telegram channel)
ALTER TABLE public.game_tasks ADD COLUMN IF NOT EXISTS url text;

-- Add task_type to differentiate task categories
ALTER TABLE public.game_tasks ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'general';

-- Allow admins to manage game_tasks
CREATE POLICY "Admins can manage tasks"
ON public.game_tasks
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update all profiles (for block/balance)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admins to view all withdrawal requests
CREATE POLICY "Admins can view all withdrawals"
ON public.withdrawal_requests
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));
