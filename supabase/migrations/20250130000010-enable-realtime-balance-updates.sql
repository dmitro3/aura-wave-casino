-- Enable real-time subscriptions for balance updates
-- This ensures the profiles table can send real-time updates to subscribers

-- Enable realtime for profiles table (skip if already enabled)
DO $$
BEGIN
    -- Only add to publication if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
        RAISE NOTICE 'Added profiles table to realtime publication';
    ELSE
        RAISE NOTICE 'Profiles table already in realtime publication - skipping';
    END IF;
END $$;

-- Enable RLS for realtime (users can only see their own profile updates)
DO $$
BEGIN
    -- Only create policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can receive realtime updates for their own profile'
    ) THEN
        CREATE POLICY "Users can receive realtime updates for their own profile" 
        ON public.profiles 
        FOR SELECT 
        USING (auth.uid() = id);
        RAISE NOTICE 'Created realtime RLS policy for profiles table';
    ELSE
        RAISE NOTICE 'Realtime RLS policy already exists - skipping';
    END IF;
END $$;

-- Verify realtime is enabled
DO $$
BEGIN
    -- Check if profiles table is in realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'profiles'
    ) THEN
        RAISE EXCEPTION 'Failed to enable realtime for profiles table';
    END IF;
    
    RAISE NOTICE 'Real-time successfully enabled for profiles table balance updates';
END $$;