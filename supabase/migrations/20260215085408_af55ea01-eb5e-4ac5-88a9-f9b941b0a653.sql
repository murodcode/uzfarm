
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_id BIGINT UNIQUE,
  username TEXT,
  first_name TEXT,
  photo_url TEXT,
  coins INTEGER NOT NULL DEFAULT 10000,
  cash INTEGER NOT NULL DEFAULT 0,
  eggs INTEGER NOT NULL DEFAULT 0,
  meat INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Animals table
CREATE TABLE public.animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type_id TEXT NOT NULL,
  growth_percent REAL NOT NULL DEFAULT 0,
  hunger REAL NOT NULL DEFAULT 50,
  last_fed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  bought_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own animals" ON public.animals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Game tasks
CREATE TABLE public.game_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  reward_cash INTEGER NOT NULL DEFAULT 0,
  is_daily BOOLEAN NOT NULL DEFAULT false,
  requirement_type TEXT NOT NULL, -- 'feed_count', 'sell_count', 'buy_animal', 'collect_eggs', etc.
  requirement_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.game_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tasks" ON public.game_tasks FOR SELECT USING (true);

-- User task completions
CREATE TABLE public.user_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.game_tasks(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

ALTER TABLE public.user_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own completions" ON public.user_task_completions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Withdrawal requests
CREATE TABLE public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own withdrawals" ON public.withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own withdrawals" ON public.withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed game tasks
INSERT INTO public.game_tasks (name, description, reward_coins, reward_cash, is_daily, requirement_type, requirement_value) VALUES
  ('Birinchi hayvon', 'Birinchi hayvoningizni sotib oling', 500, 0, false, 'buy_animal', 1),
  ('Fermer boshlanishi', '3 ta hayvon sotib oling', 1500, 100, false, 'buy_animal', 3),
  ('Tuxum yig''uvchi', '10 ta tuxum yig''ing', 800, 50, false, 'collect_eggs', 10),
  ('Go''sht ustasi', '5 kg go''sht yig''ing', 1000, 100, false, 'collect_meat', 5),
  ('Kunlik boqish', 'Bugun 3 ta hayvonni boqing', 300, 20, true, 'feed_count', 3),
  ('Kunlik savdo', 'Bugun bozorda 1 marta soting', 200, 30, true, 'sell_count', 1),
  ('Kunlik tuxum', 'Bugun 5 ta tuxum yig''ing', 250, 15, true, 'collect_eggs', 5);
