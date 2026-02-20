
CREATE OR REPLACE FUNCTION public.get_user_rank(p_user_id uuid, p_column text)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rank_val integer;
  user_val integer;
BEGIN
  IF p_column = 'referral_count' THEN
    SELECT referral_count INTO user_val FROM profiles WHERE id = p_user_id;
    SELECT COUNT(*) + 1 INTO rank_val FROM profiles WHERE referral_count > COALESCE(user_val, 0);
  ELSE
    SELECT coins INTO user_val FROM profiles WHERE id = p_user_id;
    SELECT COUNT(*) + 1 INTO rank_val FROM profiles WHERE coins > COALESCE(user_val, 0);
  END IF;
  RETURN COALESCE(rank_val, 0);
END;
$$;
