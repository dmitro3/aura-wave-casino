-- Enable real-time subscriptions for admin_users table
BEGIN;

-- Add the admin_users table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_users;

-- Ensure proper permissions for real-time subscriptions
GRANT SELECT ON public.admin_users TO authenticated;
GRANT SELECT ON public.admin_users TO anon;

-- Log success
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Real-time subscriptions enabled for admin_users table';
END $$;

COMMIT;