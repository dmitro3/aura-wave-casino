-- 🔍 COMPREHENSIVE DIAGNOSTIC - Table Format
-- This version returns results as tables instead of RAISE NOTICE

-- STEP 1: Check game_history
SELECT 
  'STEP 1: GAME HISTORY' as diagnostic_step,
  'Total games: ' || COUNT(*) as result
FROM public.game_history
UNION ALL
SELECT 
  'STEP 1: RECENT GAMES',
  'Last 24h: ' || COUNT(*)
FROM public.game_history 
WHERE created_at > NOW() - INTERVAL '24 hours'
UNION ALL
-- STEP 2: Check user_level_stats
SELECT 
  'STEP 2: USER STATS',
  'Profiles: ' || (SELECT COUNT(*) FROM public.profiles) || ', Stats rows: ' || COUNT(*)
FROM public.user_level_stats
UNION ALL
SELECT 
  'STEP 2: RECENT UPDATES',
  'Updated 24h: ' || COUNT(*)
FROM public.user_level_stats 
WHERE updated_at > NOW() - INTERVAL '24 hours'
UNION ALL
-- STEP 3: Check functions exist
SELECT 
  'STEP 3: FUNCTIONS',
  'update_user_stats_and_level: ' || 
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_user_stats_and_level'
  ) THEN 'EXISTS' ELSE 'MISSING' END
UNION ALL
-- STEP 4: Check triggers
SELECT 
  'STEP 4: TRIGGERS',
  'game_history triggers: ' || COUNT(*)
FROM information_schema.triggers 
WHERE event_object_table = 'game_history' 
AND event_object_schema = 'public'
UNION ALL
-- STEP 6: Check RLS
SELECT 
  'STEP 6: RLS',
  'user_level_stats RLS: ' || COALESCE(relrowsecurity::text, 'false')
FROM pg_class 
WHERE relname = 'user_level_stats' AND relnamespace = 'public'::regnamespace;