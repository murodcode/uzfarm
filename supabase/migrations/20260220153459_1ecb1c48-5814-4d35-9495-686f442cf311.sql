-- Add milk column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS milk integer NOT NULL DEFAULT 0;