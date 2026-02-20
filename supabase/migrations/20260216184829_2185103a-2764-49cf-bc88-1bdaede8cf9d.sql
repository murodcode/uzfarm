
-- Allow anyone authenticated to read profiles for leaderboard (only specific columns via the query)
CREATE POLICY "Anyone authenticated can view profiles for leaderboard"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL);
