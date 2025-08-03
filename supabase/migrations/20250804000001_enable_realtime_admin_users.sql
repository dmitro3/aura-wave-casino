-- Enable real-time subscriptions for admin_users table
BEGIN;

-- Add the admin_users table to the supabase_realtime publication (if not already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_users;
    RAISE NOTICE '✅ Added admin_users table to supabase_realtime publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE '⚠️ admin_users table already in supabase_realtime publication';
  END;
END $$;

-- Ensure proper permissions for real-time subscriptions
GRANT SELECT ON public.admin_users TO authenticated;
GRANT SELECT ON public.admin_users TO anon;

-- Log success
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Real-time subscriptions verified for admin_users table';
END $$;

COMMIT;