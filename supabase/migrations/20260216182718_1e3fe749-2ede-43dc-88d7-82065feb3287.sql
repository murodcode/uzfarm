
CREATE OR REPLACE FUNCTION public.get_global_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT json_build_object(
    'total_coins', COALESCE(SUM(coins), 0),
    'total_referrals', COALESCE(SUM(referral_count), 0),
    'total_eggs', COALESCE(SUM(eggs), 0)
  )
  FROM public.profiles;
$$;
