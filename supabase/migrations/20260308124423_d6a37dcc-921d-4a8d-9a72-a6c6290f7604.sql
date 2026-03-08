
-- Allow users to update is_read on their own chat messages
CREATE POLICY "Users can update own chat message read status"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
