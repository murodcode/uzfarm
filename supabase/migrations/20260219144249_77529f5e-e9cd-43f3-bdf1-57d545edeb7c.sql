
-- Add level and exp columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS level integer NOT NULL DEFAULT 1;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS exp integer NOT NULL DEFAULT 0;
