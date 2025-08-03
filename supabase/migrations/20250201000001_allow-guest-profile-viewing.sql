-- Migration: Allow guest users to view public profile information
-- This enables unauthenticated users to view other users' profiles

-- Add a policy that allows public/guest users to read basic profile information
CREATE POLICY "profiles_public_select_basic" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Also need to allow public access to user_level_stats for profile viewing
CREATE POLICY "user_level_stats_public_select" 
ON public.user_level_stats 
FOR SELECT 
USING (true);