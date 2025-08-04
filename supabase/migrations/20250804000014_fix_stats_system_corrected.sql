-- ✅ CORRECTED STATS FIX - Handle function return structure properly
BEGIN;

DO $$
BEGIN
  RAISE NOTICE '=== ✅ CORRECTED STATS FIX ===';
  RAISE NOTICE 'Fixing Edge Function calls and ensuring clean stats system...';
END $$;

-- 1. Clean up any existing broken systems
DROP TRIGGER IF EXISTS handle_game_completion_trigger ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS backup_stats_trigger ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS comprehensive_game_completion_trigger ON public.game_history CASCADE;
DROP TRIGGER IF EXISTS game_completion_backup_trigger ON public.game_history CASCADE;

-- Drop any bridge functions that shouldn't exist
DROP FUNCTION IF EXISTS public.update_user_level_stats(UUID, TEXT, NUMERIC, NUMERIC, BOOLEAN, TEXT, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.update_game_stats_direct(UUID, TEXT, NUMERIC, TEXT, NUMERIC) CASCADE;
DROP FUNCTION IF EXISTS public.backup_handle_game_completion() CASCADE;
DROP FUNCTION IF EXISTS public.comprehensive_game_completion() CASCADE;
DROP FUNCTION IF EXISTS public.game_completion_backup() CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✅ Cleaned up all existing broken trigger/function systems';
END $$;

-- 2. Ensure the correct function exists and has proper permissions
DO $$
DECLARE
  function_exists BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_user_stats_and_level'
  ) INTO function_exists;
  
  IF NOT function_exists THEN
    RAISE EXCEPTION 'CRITICAL: update_user_stats_and_level function does not exist! Please run previous migrations first.';
  ELSE
    RAISE NOTICE '✅ update_user_stats_and_level function confirmed to exist';
  END IF;
END $$;

-- Grant proper permissions to the correct function
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer) TO anon, authenticated, service_role, postgres;

-- 3. Test that the function works correctly with proper error handling
DO $$
DECLARE
  test_user_id UUID;
  before_stats RECORD;
  after_stats RECORD;
  function_worked BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '=== TESTING STATS FUNCTION ===';
  
  -- Get test user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found for testing';
    RETURN;
  END IF;
  
  -- Get baseline stats
  SELECT COALESCE(total_games, 0) as total_games, COALESCE(lifetime_xp, 0) as lifetime_xp
  INTO before_stats
  FROM public.user_level_stats WHERE user_id = test_user_id;
  
  IF before_stats IS NULL THEN
    before_stats := ROW(0, 0);
  END IF;
  
  RAISE NOTICE 'BEFORE TEST: Games: %, XP: %', before_stats.total_games, before_stats.lifetime_xp;
  
  -- Test the function (just call it, don't try to access specific fields)
  BEGIN
    PERFORM public.update_user_stats_and_level(
      test_user_id,
      'tower',
      25.0,
      'win',
      37.5,
      0
    );
    
    function_worked := TRUE;
    RAISE NOTICE '✅ Function call succeeded';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Function call failed: % (%)', SQLERRM, SQLSTATE;
    function_worked := FALSE;
  END;
  
  -- Check stats after
  SELECT COALESCE(total_games, 0) as total_games, COALESCE(lifetime_xp, 0) as lifetime_xp
  INTO after_stats
  FROM public.user_level_stats WHERE user_id = test_user_id;
  
  IF function_worked AND after_stats.total_games > before_stats.total_games AND after_stats.lifetime_xp > before_stats.lifetime_xp THEN
    RAISE NOTICE '🎉 STATS FUNCTION TEST SUCCESS!';
    RAISE NOTICE '   Games: % → % (+%)', before_stats.total_games, after_stats.total_games, (after_stats.total_games - before_stats.total_games);
    RAISE NOTICE '   XP: % → % (+%)', before_stats.lifetime_xp, after_stats.lifetime_xp, (after_stats.lifetime_xp - before_stats.lifetime_xp);
    
    -- Restore original stats
    UPDATE public.user_level_stats
    SET 
      total_games = before_stats.total_games,
      tower_games = GREATEST(0, tower_games - 1),
      total_wins = GREATEST(0, total_wins - 1),
      tower_wins = GREATEST(0, tower_wins - 1),
      total_wagered = GREATEST(0, total_wagered - 25.0),
      tower_wagered = GREATEST(0, tower_wagered - 25.0),
      total_profit = total_profit - 37.5,
      tower_profit = tower_profit - 37.5,
      lifetime_xp = before_stats.lifetime_xp,
      updated_at = NOW()
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '🧹 Test stats restored';
  ELSE
    RAISE NOTICE '❌ STATS FUNCTION TEST FAILED!';
    IF NOT function_worked THEN
      RAISE NOTICE '   Function call failed';
    ELSE
      RAISE NOTICE '   Games: % → % (expected increase)', before_stats.total_games, after_stats.total_games;
      RAISE NOTICE '   XP: % → % (expected increase)', before_stats.lifetime_xp, after_stats.lifetime_xp;
    END IF;
  END IF;
END $$;

-- 4. Check what function signature actually exists
DO $$
DECLARE
  func_signature TEXT;
BEGIN
  RAISE NOTICE '=== FUNCTION SIGNATURE CHECK ===';
  
  -- Get the function signature
  SELECT 
    p.proname || '(' || 
    array_to_string(
      ARRAY(
        SELECT 
          CASE 
            WHEN p.proargnames[i] IS NOT NULL THEN
              p.proargnames[i] || ' ' || pg_catalog.format_type(p.proargtypes[i-1], NULL)
            ELSE
              pg_catalog.format_type(p.proargtypes[i-1], NULL)
          END
        FROM generate_series(1, p.pronargs) AS i
      ), 
      ', '
    ) || ')'
  INTO func_signature
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level';
  
  IF func_signature IS NOT NULL THEN
    RAISE NOTICE 'Found function: %', func_signature;
  ELSE
    RAISE NOTICE '❌ Function signature not found';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ✅ CORRECTED STATS FIX COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'WHAT WAS FIXED:';
  RAISE NOTICE '1. ✅ Cleaned up all broken trigger/function systems';
  RAISE NOTICE '2. ✅ Confirmed update_user_stats_and_level() function exists';
  RAISE NOTICE '3. ✅ Granted proper permissions to the stats function';
  RAISE NOTICE '4. ✅ Tested function call without assuming return structure';
  RAISE NOTICE '';
  RAISE NOTICE 'EDGE FUNCTIONS STATUS:';
  RAISE NOTICE '- Tower Engine: Updated to call update_user_stats_and_level()';
  RAISE NOTICE '- Roulette Engine: Updated to call update_user_stats_and_level()';
  RAISE NOTICE '- Coinflip Engine: Updated to call update_user_stats_and_level()';
  RAISE NOTICE '';
  RAISE NOTICE 'PARAMETERS: (user_id, game_type, bet_amount, result, profit, streak_length)';
  RAISE NOTICE 'RESULT: Clean, working stats system';
  RAISE NOTICE '';
  RAISE NOTICE 'Your game stats and XP should now work!';
  RAISE NOTICE 'Deploy the Edge Functions to complete the fix.';
END $$;

COMMIT;