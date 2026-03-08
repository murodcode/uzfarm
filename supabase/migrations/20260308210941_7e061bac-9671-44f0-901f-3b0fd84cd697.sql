
-- Contests table
CREATE TABLE public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  channel_id text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contest prizes (top 1-10)
CREATE TABLE public.contest_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  place integer NOT NULL,
  reward_coins integer NOT NULL DEFAULT 0,
  reward_description text NOT NULL DEFAULT '',
  UNIQUE(contest_id, place)
);

-- Contest referrals tracking (only during contest period)
CREATE TABLE public.contest_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contest_id, referred_id)
);

-- RLS
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_referrals ENABLE ROW LEVEL SECURITY;

-- Contests: admins manage, anyone can read
CREATE POLICY "Admins can manage contests" ON public.contests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read contests" ON public.contests FOR SELECT TO authenticated
  USING (true);

-- Prizes: admins manage, anyone can read
CREATE POLICY "Admins can manage prizes" ON public.contest_prizes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read prizes" ON public.contest_prizes FOR SELECT TO authenticated
  USING (true);

-- Referrals: admins manage all, users can read own
CREATE POLICY "Admins can manage contest referrals" ON public.contest_referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can read own contest referrals" ON public.contest_referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);
CREATE POLICY "Users can read all contest referrals for leaderboard" ON public.contest_referrals FOR SELECT TO authenticated
  USING (true);
