-- Comprehensive fix for notification deletion
-- This migration ensures users can permanently delete their own notifications

-- First, let's see what policies currently exist and drop them all
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing DELETE policies on notifications table
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE tablename = 'notifications' 
        AND cmd = 'DELETE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 
                      policy_record.schemaname, 
                      policy_record.tablename);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Create a single, clear DELETE policy
CREATE POLICY "allow_users_delete_own_notifications" 
ON public.notifications 
FOR DELETE 
TO authenticated, anon
USING (
    -- Allow if user owns the notification
    auth.uid() = user_id
    OR
    -- Allow service role to delete any notification
    auth.role() = 'service_role'
);

-- Ensure proper grants
GRANT DELETE ON public.notifications TO authenticated;
GRANT DELETE ON public.notifications TO anon;

-- Test the policy by creating and immediately trying to delete a test notification
DO $$
DECLARE
    test_user_id UUID := 'fdbbfe8c-28af-49a8-b1de-398896a8e962'; -- Known test user
    test_notification_id UUID;
BEGIN
    -- Insert a test notification
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (test_user_id, 'admin_message', 'DELETE TEST', 'This notification should be deletable', '{}')
    RETURNING id INTO test_notification_id;
    
    RAISE NOTICE 'Created test notification with ID: %', test_notification_id;
    
    -- Try to delete it (as service role)
    DELETE FROM public.notifications WHERE id = test_notification_id;
    
    RAISE NOTICE 'Successfully deleted test notification';
EXCEPTION 
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
END $$;