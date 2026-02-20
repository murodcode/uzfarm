
-- 1. Add card_number to withdrawal_requests
ALTER TABLE public.withdrawal_requests ADD COLUMN card_number text;

-- 2. Add referral columns to profiles
ALTER TABLE public.profiles ADD COLUMN referred_by uuid;
ALTER TABLE public.profiles ADD COLUMN referral_count integer NOT NULL DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN referral_earnings integer NOT NULL DEFAULT 0;

-- 3. Create app_settings table for admin config (referral bonus, etc.)
CREATE TABLE public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings
CREATE POLICY "Anyone can read settings"
ON public.app_settings FOR SELECT
USING (true);

-- Only admins can modify settings
CREATE POLICY "Admins can manage settings"
ON public.app_settings FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default referral settings
INSERT INTO public.app_settings (key, value) VALUES
  ('referral', '{"enabled": true, "referrer_bonus": 500, "referee_bonus": 200, "min_tasks_required": 0}'::jsonb);
