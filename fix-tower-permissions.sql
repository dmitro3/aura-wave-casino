-- Fix Tower Game Permission Issues & Live Bet Feed Issues
-- Problem 1: Service role needs access to tower_games table for the cloud function
-- Problem 2: Live bet feed may have RLS/constraint issues for roulette

-- First, grant necessary permissions to service_role
GRANT ALL ON public.tower_games TO service_role;
GRANT ALL ON public.tower_levels TO service_role;
GRANT ALL ON public.live_bet_feed TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Update RLS policies to allow service_role access
-- Drop existing tower_games policies
DROP POLICY IF EXISTS "Users can view their own tower games" ON public.tower_games;
DROP POLICY IF EXISTS "Users can insert their own tower games" ON public.tower_games;
DROP POLICY IF EXISTS "Users can update their own tower games" ON public.tower_games;
DROP POLICY IF EXISTS "Allow service role and users to view tower games" ON public.tower_games;
DROP POLICY IF EXISTS "Allow service role and users to insert tower games" ON public.tower_games;
DROP POLICY IF EXISTS "Allow service role and users to update tower games" ON public.tower_games;

-- Drop existing tower_levels policies
DROP POLICY IF EXISTS "Users can view their own tower levels" ON public.tower_levels;
DROP POLICY IF EXISTS "Users can insert their own tower levels" ON public.tower_levels;
DROP POLICY IF EXISTS "Allow service role and users to view tower levels" ON public.tower_levels;
DROP POLICY IF EXISTS "Allow service role and users to insert tower levels" ON public.tower_levels;

-- Create new tower_games policies that allow service_role and users
CREATE POLICY "Allow service role and users to view tower games" 
ON public.tower_games 
FOR SELECT 
USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

CREATE POLICY "Allow service role and users to insert tower games" 
ON public.tower_games 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

CREATE POLICY "Allow service role and users to update tower games" 
ON public.tower_games 
FOR UPDATE 
USING (
  auth.role() = 'service_role' OR 
  auth.uid() = user_id
);

-- Create new tower_levels policies that allow service_role and users
CREATE POLICY "Allow service role and users to view tower levels" 
ON public.tower_levels 
FOR SELECT 
USING (
  auth.role() = 'service_role' OR 
  auth.uid() = (SELECT user_id FROM public.tower_games WHERE id = tower_levels.game_id)
);

CREATE POLICY "Allow service role and users to insert tower levels" 
ON public.tower_levels 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role' OR 
  auth.uid() = (SELECT user_id FROM public.tower_games WHERE id = tower_levels.game_id)
);

-- Fix live_bet_feed constraints and policies
-- Ensure roulette is allowed in game_type constraint
ALTER TABLE public.live_bet_feed 
DROP CONSTRAINT IF EXISTS live_bet_feed_game_type_check;

ALTER TABLE public.live_bet_feed 
ADD CONSTRAINT live_bet_feed_game_type_check 
CHECK (game_type = ANY (ARRAY['crash'::text, 'coinflip'::text, 'tower'::text, 'roulette'::text]));

-- Add roulette-specific columns if missing
ALTER TABLE public.live_bet_feed 
ADD COLUMN IF NOT EXISTS bet_color TEXT;

ALTER TABLE public.live_bet_feed 
ADD COLUMN IF NOT EXISTS round_id UUID;

ALTER TABLE public.live_bet_feed 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Drop existing live_bet_feed policies
DROP POLICY IF EXISTS "Anyone can view live bet feed" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Authenticated users can insert live bet feed" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Public read access" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Authenticated users can insert" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Service role can do everything" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Allow all to read live_bet_feed" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Allow service role and authenticated to insert live_bet_feed" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Allow service role to update live_bet_feed" ON public.live_bet_feed;
DROP POLICY IF EXISTS "Allow service role to delete live_bet_feed" ON public.live_bet_feed;

-- Create comprehensive policies for live_bet_feed
CREATE POLICY "Allow all to read live_bet_feed" 
ON public.live_bet_feed 
FOR SELECT 
USING (true);

CREATE POLICY "Allow service role and authenticated to insert live_bet_feed" 
ON public.live_bet_feed 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role' OR 
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow service role to update live_bet_feed" 
ON public.live_bet_feed 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to delete live_bet_feed" 
ON public.live_bet_feed 
FOR DELETE 
USING (auth.role() = 'service_role');

-- Add index for efficient roulette bet queries if not exists
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_roulette 
ON public.live_bet_feed(game_type, round_id) 
WHERE game_type = 'roulette';

-- Ensure realtime is enabled
ALTER TABLE public.live_bet_feed REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_bet_feed;