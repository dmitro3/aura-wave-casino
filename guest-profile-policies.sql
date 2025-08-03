-- Migration: Allow guest users to view public profile information
-- This enables unauthenticated users to view other users' profiles

-- Check if policies already exist before creating them
DO $$
BEGIN
    -- Add a policy that allows public/guest users to read basic profile information
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'profiles_public_select_basic'
    ) THEN
        CREATE POLICY "profiles_public_select_basic" 
        ON public.profiles 
        FOR SELECT 
        USING (true);
        RAISE NOTICE 'Created policy: profiles_public_select_basic';
    ELSE
        RAISE NOTICE 'Policy profiles_public_select_basic already exists';
    END IF;

    -- Also need to allow public access to user_level_stats for profile viewing
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_level_stats' 
        AND policyname = 'user_level_stats_public_select'
    ) THEN
        CREATE POLICY "user_level_stats_public_select" 
        ON public.user_level_stats 
        FOR SELECT 
        USING (true);
        RAISE NOTICE 'Created policy: user_level_stats_public_select';
    ELSE
        RAISE NOTICE 'Policy user_level_stats_public_select already exists';
    END IF;
END $$;