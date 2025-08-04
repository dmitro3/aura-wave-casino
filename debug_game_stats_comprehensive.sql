-- 🔍 COMPREHENSIVE GAME STATS DIAGNOSTIC
-- Run this in Supabase SQL Editor to diagnose game stats tracking issues

BEGIN;

-- =====================
-- 1. CHECK TABLE STRUCTURE
-- =====================
DO $$ 
BEGIN
  RAISE NOTICE '=== 📊 TABLE STRUCTURE CHECK ===';
END $$;

-- Check if user_level_stats table exists with correct columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_level_stats' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if game_history table exists with correct columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'game_history' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================
-- 2. CHECK FUNCTIONS EXIST
-- =====================
DO $$ 
BEGIN
  RAISE NOTICE '=== 🔧 FUNCTION EXISTENCE CHECK ===';
END $$;

-- Check if required functions exist
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'handle_game_completion',
  'update_user_stats_and_level',
  'calculate_level_from_xp_new'
)
ORDER BY routine_name;

-- =====================
-- 3. CHECK TRIGGERS
-- =====================
DO $$ 
BEGIN
  RAISE NOTICE '=== ⚡ TRIGGER CHECK ===';
END $$;

-- Check if game_history trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'game_history'
AND trigger_schema = 'public';

-- =====================
-- 4. CHECK RECENT GAME HISTORY
-- =====================
DO $$ 
BEGIN
  RAISE NOTICE '=== 🎮 RECENT GAME HISTORY CHECK ===';
END $$;

-- Check recent game history entries (last 10)
SELECT 
  id,
  user_id,
  game_type,
  bet_amount,
  result,
  profit,
  created_at
FROM public.game_history 
ORDER BY created_at DESC 
LIMIT 10;

-- =====================
-- 5. CHECK USER STATS UPDATES
-- =====================
DO $$ 
BEGIN
  RAISE NOTICE '=== 📈 USER STATS RECENT UPDATES CHECK ===';
END $$;

-- Check recent user_level_stats updates
SELECT 
  user_id,
  total_games,
  total_wins,
  total_wagered,
  total_profit,
  coinflip_games,
  tower_games,
  roulette_games,
  crash_games,
  updated_at
FROM public.user_level_stats 
WHERE updated_at >= NOW() - INTERVAL '1 day'
ORDER BY updated_at DESC;

-- =====================
-- 6. FUNCTION PERMISSION CHECK
-- =====================
DO $$ 
BEGIN
  RAISE NOTICE '=== 🔐 FUNCTION PERMISSIONS CHECK ===';
END $$;

-- Check function permissions
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.routine_privileges 
WHERE routine_name IN ('handle_game_completion', 'update_user_stats_and_level')
AND routine_schema = 'public';

-- =====================
-- 7. TEST FUNCTION CALL
-- =====================
DO $$ 
DECLARE
  test_result RECORD;
  function_exists BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '=== 🧪 FUNCTION TEST CALL ===';
  
  -- Check if update_user_stats_and_level function exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_user_stats_and_level'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ update_user_stats_and_level function exists';
    
    -- Try to call the function with dummy data
    -- NOTE: This won't actually update anything as we're using a random UUID
    BEGIN
      SELECT * INTO test_result 
      FROM public.update_user_stats_and_level(
        gen_random_uuid(), 
        'test_game', 
        10.00, 
        'win', 
        5.00, 
        0
      );
      RAISE NOTICE '✅ Function call successful - would level up: %, new level: %', 
        test_result.leveled_up, test_result.new_level;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Function call failed: % - %', SQLSTATE, SQLERRM;
    END;
  ELSE
    RAISE NOTICE '❌ update_user_stats_and_level function does not exist!';
  END IF;
END $$;

-- =====================
-- 8. RLS POLICIES CHECK
-- =====================
DO $$ 
BEGIN
  RAISE NOTICE '=== 🛡️ RLS POLICIES CHECK ===';
END $$;

-- Check RLS policies on user_level_stats
SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_level_stats'
AND schemaname = 'public';

-- =====================
-- 9. SAMPLE DATA ANALYSIS
-- =====================
DO $$ 
BEGIN
  RAISE NOTICE '=== 📊 SAMPLE DATA ANALYSIS ===';
END $$;

-- Check if there are any users with games but no stats updates
WITH game_counts AS (
  SELECT 
    user_id,
    COUNT(*) as games_played,
    SUM(bet_amount) as total_wagered,
    COUNT(CASE WHEN result = 'win' OR result = 'cash_out' THEN 1 END) as wins
  FROM public.game_history 
  WHERE created_at >= NOW() - INTERVAL '7 days'
  GROUP BY user_id
),
stats_data AS (
  SELECT 
    user_id,
    total_games,
    total_wagered,
    total_wins
  FROM public.user_level_stats
)
SELECT 
  gc.user_id,
  gc.games_played as actual_games,
  COALESCE(sd.total_games, 0) as recorded_games,
  gc.total_wagered as actual_wagered,
  COALESCE(sd.total_wagered, 0) as recorded_wagered,
  gc.wins as actual_wins,
  COALESCE(sd.total_wins, 0) as recorded_wins,
  CASE 
    WHEN sd.user_id IS NULL THEN 'NO_STATS_RECORD'
    WHEN gc.games_played != sd.total_games THEN 'GAMES_MISMATCH'
    WHEN gc.total_wagered != sd.total_wagered THEN 'WAGERED_MISMATCH'
    WHEN gc.wins != sd.total_wins THEN 'WINS_MISMATCH'
    ELSE 'MATCH'
  END as status
FROM game_counts gc
FULL OUTER JOIN stats_data sd ON gc.user_id = sd.user_id
WHERE gc.user_id IS NOT NULL
ORDER BY gc.games_played DESC;

COMMIT;

-- =====================
-- SUMMARY REPORT
-- =====================
DO $$ 
BEGIN
  RAISE NOTICE '=== 📋 DIAGNOSTIC COMPLETE ===';
  RAISE NOTICE 'Check the output above for:';
  RAISE NOTICE '1. Table structure completeness';
  RAISE NOTICE '2. Function and trigger existence';
  RAISE NOTICE '3. Recent game activity vs stats updates';
  RAISE NOTICE '4. Permission issues';
  RAISE NOTICE '5. Data consistency mismatches';
  RAISE NOTICE '';
  RAISE NOTICE 'Look for MISMATCH status in the final analysis!';
END $$;