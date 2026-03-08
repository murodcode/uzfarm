
-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  image_url text,
  button_text text,
  button_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- User notification read status
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_id)
);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read notifications
CREATE POLICY "Anyone can read notifications" ON public.notifications
  FOR SELECT TO authenticated USING (true);

-- Admins can manage notifications
CREATE POLICY "Admins can manage notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can read own user_notifications
CREATE POLICY "Users can read own notification status" ON public.user_notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can update own notification status
CREATE POLICY "Users can update own notification status" ON public.user_notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can insert own notification status
CREATE POLICY "Users can insert own notification status" ON public.user_notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Admins can manage all user_notifications
CREATE POLICY "Admins can manage user_notifications" ON public.user_notifications
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
