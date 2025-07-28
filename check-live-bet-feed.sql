-- Check live_bet_feed table for roulette bets
-- This will help diagnose if the issue is with data insertion or real-time subscription

-- Check total count of live bet feed entries
SELECT 
  'TOTAL_ENTRIES' as metric,
  COUNT(*) as value
FROM public.live_bet_feed;

-- Check entries by game type
SELECT 
  'BY_GAME_TYPE' as metric,
  game_type,
  COUNT(*) as count,
  MAX(created_at) as latest_entry
FROM public.live_bet_feed 
GROUP BY game_type
ORDER BY count DESC;

-- Check recent roulette entries (last 24 hours)
SELECT 
  'RECENT_ROULETTE' as metric,
  COUNT(*) as count,
  MAX(created_at) as latest_entry
FROM public.live_bet_feed 
WHERE game_type = 'roulette' 
  AND created_at > NOW() - INTERVAL '24 hours';

-- Show latest 10 entries from live_bet_feed
SELECT 
  'LATEST_ENTRIES' as metric,
  id,
  username,
  game_type,
  bet_amount,
  bet_color,
  result,
  created_at
FROM public.live_bet_feed 
ORDER BY created_at DESC 
LIMIT 10;

-- Check if there are any roulette bets in roulette_bets table
SELECT 
  'ROULETTE_BETS_COUNT' as metric,
  COUNT(*) as count,
  MAX(created_at) as latest_bet
FROM public.roulette_bets 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- Check if live_bet_feed has corresponding entries for recent roulette bets
SELECT 
  'MISSING_LIVE_FEED' as metric,
  COUNT(*) as missing_count
FROM public.roulette_bets rb
LEFT JOIN public.live_bet_feed lbf ON rb.id = lbf.id
WHERE rb.created_at > NOW() - INTERVAL '24 hours'
  AND lbf.id IS NULL;