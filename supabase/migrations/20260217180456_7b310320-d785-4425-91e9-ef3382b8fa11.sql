
-- Add referral_level column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_level integer NOT NULL DEFAULT 0;

-- Create referral_transactions table
CREATE TABLE IF NOT EXISTS public.referral_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  amount integer NOT NULL DEFAULT 0,
  percent integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.referral_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own referral transactions"
  ON public.referral_transactions FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Service role can insert referral transactions"
  ON public.referral_transactions FOR INSERT
  WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_referral_transactions_referrer ON public.referral_transactions (referrer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON public.profiles (referred_by);
