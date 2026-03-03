
-- Add grown_at and feed_count columns to animals table
ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS grown_at timestamptz;
ALTER TABLE public.animals ADD COLUMN IF NOT EXISTS feed_count integer NOT NULL DEFAULT 0;

-- For existing grown animals, set grown_at to now so they get 48h from now
UPDATE public.animals SET grown_at = now() WHERE growth_percent >= 100 AND grown_at IS NULL;

-- For existing animals, estimate feed_count based on growth_percent
UPDATE public.animals SET feed_count = CEIL(growth_percent / 10) WHERE growth_percent > 0 AND feed_count = 0;

-- Reset last_fed_at for existing animals to give them fresh 48h window
UPDATE public.animals SET last_fed_at = now() WHERE last_fed_at < '2000-01-01'::timestamptz;
