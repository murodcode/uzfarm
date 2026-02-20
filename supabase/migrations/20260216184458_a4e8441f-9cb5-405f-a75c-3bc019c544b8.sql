
-- Indexes for leaderboard performance
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles (coins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_count ON public.profiles (referral_count DESC);
