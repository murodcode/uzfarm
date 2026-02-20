
-- Daily task progress tracking table
CREATE TABLE public.daily_task_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  task_key text NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  target integer NOT NULL DEFAULT 1,
  reward_coins integer NOT NULL DEFAULT 0,
  reward_claimed boolean NOT NULL DEFAULT false,
  task_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_key, task_date)
);

ALTER TABLE public.daily_task_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own daily progress"
  ON public.daily_task_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily progress"
  ON public.daily_task_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily progress"
  ON public.daily_task_progress FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all daily progress"
  ON public.daily_task_progress FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
