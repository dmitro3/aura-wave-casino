-- Enable real-time subscriptions for user_level_stats updates
-- This ensures the user_level_stats table can send real-time updates to subscribers

-- Enable realtime for user_level_stats table (skip if already enabled)
DO $$
BEGIN
    -- Only add to publication if not already there
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'user_level_stats'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_level_stats;
        RAISE NOTICE 'Added user_level_stats table to realtime publication';
    ELSE
        RAISE NOTICE 'user_level_stats table already in realtime publication - skipping';
    END IF;
END $$;

-- Enable RLS for realtime (users can only see their own stats updates)
DO $$
BEGIN
    -- Only create policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_level_stats' 
        AND policyname = 'Users can receive realtime updates for their own stats'
    ) THEN
        CREATE POLICY "Users can receive realtime updates for their own stats" 
        ON public.user_level_stats 
        FOR SELECT 
        USING (auth.uid() = user_id);
        RAISE NOTICE 'Created realtime RLS policy for user_level_stats table';
    ELSE
        RAISE NOTICE 'Realtime RLS policy for user_level_stats already exists - skipping';
    END IF;
END $$;

-- Verify realtime is enabled
DO $$
BEGIN
    -- Check if user_level_stats table is in realtime publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'user_level_stats'
    ) THEN
        RAISE EXCEPTION 'Failed to enable realtime for user_level_stats table';
    END IF;
    
    RAISE NOTICE 'Real-time successfully enabled for user_level_stats table updates';
END $$;