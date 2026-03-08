
-- Add field column to animals (1, 2, or 3)
ALTER TABLE public.animals ADD COLUMN field integer NOT NULL DEFAULT 1;

-- Add unlocked_fields to profiles (1 = only field 1, 2 = fields 1+2, 3 = all)
ALTER TABLE public.profiles ADD COLUMN unlocked_fields integer NOT NULL DEFAULT 1;
