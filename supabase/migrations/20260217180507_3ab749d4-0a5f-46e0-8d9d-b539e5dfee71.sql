
-- Fix: restrict INSERT to service role only by making it impossible for anon/authenticated
DROP POLICY IF EXISTS "Service role can insert referral transactions" ON public.referral_transactions;
CREATE POLICY "No direct insert for users"
  ON public.referral_transactions FOR INSERT
  WITH CHECK (false);
