
-- Allow admins to update withdrawal_requests via security definer
CREATE POLICY "Admins can update withdrawals"
ON public.withdrawal_requests
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
