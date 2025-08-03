-- Fix admin notification broadcast policy
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can insert notifications for any user" ON public.notifications;

-- Create a more permissive policy for admin notification broadcasts
CREATE POLICY "Service role can insert notifications for any user" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create a policy specifically for authenticated admin users
CREATE POLICY "Authenticated admins can insert notifications for any user" 
ON public.notifications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Ensure admin users can also view all notifications for management purposes
CREATE POLICY "Admins can view all notifications" 
ON public.notifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  )
);