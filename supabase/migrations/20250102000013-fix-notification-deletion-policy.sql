-- Fix notification deletion policy to ensure users can delete their own notifications
-- Drop all existing DELETE policies that might be conflicting
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_unified_delete" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_admin_delete" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_all" ON public.notifications;

-- Create a clear and simple DELETE policy for users
CREATE POLICY "users_can_delete_own_notifications" 
ON public.notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure service role can also delete any notification (for admin operations)
CREATE POLICY "service_role_can_delete_any_notification" 
ON public.notifications 
FOR DELETE 
USING (auth.role() = 'service_role');

-- Ensure proper grants for DELETE operations
GRANT DELETE ON public.notifications TO authenticated;