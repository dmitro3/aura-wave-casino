-- Fix live bet feed for roulette
-- This script ensures that roulette bets are properly inserted into live_bet_feed

-- First, let's check the current state
SELECT 'CURRENT_STATE' as info, COUNT(*) as total_entries FROM public.live_bet_feed;

-- Check if roulette is in the game_type constraint
SELECT 
  'CONSTRAINT_CHECK' as info,
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'public.live_bet_feed'::regclass 
  AND contype = 'c';

-- Ensure roulette is allowed in the game_type constraint
ALTER TABLE public.live_bet_feed 
DROP CONSTRAINT IF EXISTS live_bet_feed_game_type_check;

ALTER TABLE public.live_bet_feed 
ADD CONSTRAINT live_bet_feed_game_type_check 
CHECK (game_type = ANY (ARRAY['crash'::text, 'coinflip'::text, 'tower'::text, 'roulette'::text]));

-- Ensure all required columns exist
ALTER TABLE public.live_bet_feed 
ADD COLUMN IF NOT EXISTS bet_color TEXT,
ADD COLUMN IF NOT EXISTS round_id UUID,
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS streak_length INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'completed';

-- Drop and recreate RLS policies to ensure they're correct
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

-- Grant necessary permissions
GRANT ALL ON public.live_bet_feed TO service_role;
GRANT SELECT ON public.live_bet_feed TO anon, authenticated;
GRANT INSERT ON public.live_bet_feed TO authenticated;

-- Ensure realtime is properly configured
ALTER TABLE public.live_bet_feed REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_bet_feed;

-- Create index for efficient roulette queries
CREATE INDEX IF NOT EXISTS idx_live_bet_feed_roulette 
ON public.live_bet_feed(game_type, round_id) 
WHERE game_type = 'roulette';

CREATE INDEX IF NOT EXISTS idx_live_bet_feed_created_at 
ON public.live_bet_feed(created_at DESC);

-- Create a function to manually insert roulette bets into live_bet_feed
CREATE OR REPLACE FUNCTION public.insert_roulette_bet_to_live_feed(
  p_user_id UUID,
  p_username TEXT,
  p_avatar_url TEXT,
  p_bet_amount NUMERIC,
  p_bet_color TEXT,
  p_round_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_live_feed_id UUID;
BEGIN
  -- Insert into live_bet_feed
  INSERT INTO public.live_bet_feed (
    user_id,
    username,
    avatar_url,
    game_type,
    bet_amount,
    bet_color,
    round_id,
    result,
    profit,
    created_at
  ) VALUES (
    p_user_id,
    p_username,
    p_avatar_url,
    'roulette',
    p_bet_amount,
    p_bet_color,
    p_round_id,
    'pending',
    0,
    NOW()
  ) RETURNING id INTO v_live_feed_id;
  
  RETURN v_live_feed_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.insert_roulette_bet_to_live_feed TO service_role;

-- Test the function with a sample entry (if you want to test)
-- SELECT public.insert_roulette_bet_to_live_feed(
--   '00000000-0000-0000-0000-000000000000'::UUID,
--   'TestUser',
--   NULL,
--   10.00,
--   'red',
--   '00000000-0000-0000-0000-000000000000'::UUID
-- );

-- Show final state
SELECT 'FINAL_STATE' as info, COUNT(*) as total_entries FROM public.live_bet_feed;

-- Show recent entries
SELECT 
  'RECENT_ENTRIES' as info,
  id,
  username,
  game_type,
  bet_amount,
  bet_color,
  created_at
FROM public.live_bet_feed 
ORDER BY created_at DESC 
LIMIT 5;