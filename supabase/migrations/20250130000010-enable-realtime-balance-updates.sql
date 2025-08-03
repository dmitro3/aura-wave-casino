-- Enable real-time subscriptions for balance updates
-- This ensures the profiles table can send real-time updates to subscribers

-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable RLS for realtime (users can only see their own profile updates)
CREATE POLICY "Users can receive realtime updates for their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

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