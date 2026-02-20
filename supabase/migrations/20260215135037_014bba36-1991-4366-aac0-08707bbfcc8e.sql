
-- Create admin transaction logs table
CREATE TABLE public.admin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'add', 'subtract', 'block', 'unblock'
  field text, -- 'coins', 'cash', or null for block actions
  amount integer DEFAULT 0,
  old_value integer DEFAULT 0,
  new_value integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_transactions ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write transaction logs
CREATE POLICY "Admins can manage transactions"
ON public.admin_transactions
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
