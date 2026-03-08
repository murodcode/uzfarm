
-- General chat messages table
CREATE TABLE public.general_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  first_name TEXT,
  username TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.general_chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read general chat
CREATE POLICY "Anyone can read general chat"
  ON public.general_chat_messages FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert own messages
CREATE POLICY "Users can insert own general chat"
  ON public.general_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can delete any message
CREATE POLICY "Admins can delete general chat"
  ON public.general_chat_messages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Chat bans table
CREATE TABLE public.chat_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  banned_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_bans ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can check bans (needed for client-side check)
CREATE POLICY "Anyone can read chat bans"
  ON public.chat_bans FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage bans
CREATE POLICY "Admins can manage chat bans"
  ON public.chat_bans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for general chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.general_chat_messages;
