-- Test script to manually insert a roulette bet into live_bet_feed
-- This will help verify if the live bet feed is working correctly

-- First, let's see the current state
SELECT 'BEFORE_TEST' as stage, COUNT(*) as total_entries FROM public.live_bet_feed;

-- Get a sample user ID from profiles
SELECT 'SAMPLE_USER' as info, id, username FROM public.profiles LIMIT 1;

-- Get a sample round ID from roulette_rounds
SELECT 'SAMPLE_ROUND' as info, id, round_number FROM public.roulette_rounds ORDER BY created_at DESC LIMIT 1;

-- Manually insert a test entry into live_bet_feed
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
  (SELECT id FROM public.profiles LIMIT 1),
  'TestUser',
  NULL,
  'roulette',
  10.00,
  'red',
  (SELECT id FROM public.roulette_rounds ORDER BY created_at DESC LIMIT 1),
  'pending',
  0,
  NOW()
) RETURNING id, username, game_type, bet_amount, bet_color, created_at;

-- Check the state after insertion
SELECT 'AFTER_TEST' as stage, COUNT(*) as total_entries FROM public.live_bet_feed;

-- Show the latest entries
SELECT 
  'LATEST_ENTRIES' as info,
  id,
  username,
  game_type,
  bet_amount,
  bet_color,
  result,
  created_at
FROM public.live_bet_feed 
ORDER BY created_at DESC 
LIMIT 5;