-- 🔍 COMPREHENSIVE DIAGNOSTIC - Find the fundamental issue
-- Run this in Supabase SQL Editor to trace the entire stats flow

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '=== 🔍 COMPREHENSIVE DIAGNOSTIC ===';
  RAISE NOTICE 'Checking every step of the stats flow...';
END $$;

-- 1. Check if games are being recorded in game_history
DO $$
DECLARE
  game_count INTEGER;
  recent_game RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 1: GAME HISTORY CHECK ===';
  
  SELECT COUNT(*) INTO game_count FROM public.game_history;
  RAISE NOTICE 'Total games in history: %', game_count;
  
  SELECT COUNT(*) INTO game_count 
  FROM public.game_history 
  WHERE created_at > NOW() - INTERVAL '24 hours';
  RAISE NOTICE 'Games in last 24 hours: %', game_count;
  
  -- Show most recent games
  FOR recent_game IN 
    SELECT user_id, game_type, bet_amount, result, profit, created_at
    FROM public.game_history 
    ORDER BY created_at DESC 
    LIMIT 3
  LOOP
    RAISE NOTICE 'Recent: % | % | $% | % | $% | %',
      recent_game.user_id, recent_game.game_type, recent_game.bet_amount, 
      recent_game.result, recent_game.profit, recent_game.created_at;
  END LOOP;
  
  IF game_count = 0 THEN
    RAISE NOTICE '❌ CRITICAL: No games in game_history! Edge Functions not inserting properly.';
  END IF;
END $$;

-- 2. Check user_level_stats table structure and data
DO $$
DECLARE
  stats_count INTEGER;
  profile_count INTEGER;
  recent_update RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 2: USER_LEVEL_STATS CHECK ===';
  
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO stats_count FROM public.user_level_stats;
  
  RAISE NOTICE 'Profiles: %, Stats rows: %', profile_count, stats_count;
  
  IF stats_count = 0 THEN
    RAISE NOTICE '❌ CRITICAL: No user_level_stats rows exist!';
  END IF;
  
  -- Check recent updates
  SELECT COUNT(*) INTO stats_count 
  FROM public.user_level_stats 
  WHERE updated_at > NOW() - INTERVAL '24 hours';
  RAISE NOTICE 'Stats updated in last 24 hours: %', stats_count;
  
  -- Show recent stats
  FOR recent_update IN 
    SELECT user_id, current_level, lifetime_xp, total_games, tower_games, updated_at
    FROM public.user_level_stats 
    ORDER BY updated_at DESC 
    LIMIT 3
  LOOP
    RAISE NOTICE 'Stats: % | Level % | XP % | Games %/% | %',
      recent_update.user_id, recent_update.current_level, recent_update.lifetime_xp, 
      recent_update.total_games, recent_update.tower_games, recent_update.updated_at;
  END LOOP;
END $$;

-- 3. Check what functions exist and their signatures
DO $$
DECLARE
  func_record RECORD;
  func_signature TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 3: FUNCTION EXISTENCE CHECK ===';
  
  -- Check all relevant functions
  FOR func_record IN 
    SELECT routine_name, routine_type
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN (
      'update_user_stats_and_level',
      'update_user_level_stats', 
      'add_xp_and_check_levelup',
      'calculate_level_from_xp_new'
    )
    ORDER BY routine_name
  LOOP
    RAISE NOTICE 'FUNCTION: % (type: %)', func_record.routine_name, func_record.routine_type;
  END LOOP;
  
  -- Get detailed signature for update_user_stats_and_level
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
    ) || ') RETURNS ' || pg_catalog.format_type(p.prorettype, NULL)
  INTO func_signature
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'update_user_stats_and_level';
  
  IF func_signature IS NOT NULL THEN
    RAISE NOTICE 'Signature: %', func_signature;
  ELSE
    RAISE NOTICE '❌ update_user_stats_and_level signature not found';
  END IF;
END $$;

-- 4. Check if any triggers exist on game_history
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 4: TRIGGER CHECK ===';
  
  FOR trigger_record IN 
    SELECT trigger_name, action_statement, action_timing, event_manipulation
    FROM information_schema.triggers 
    WHERE event_object_table = 'game_history' 
    AND event_object_schema = 'public'
  LOOP
    RAISE NOTICE 'TRIGGER: % | TIMING: % | EVENT: % | ACTION: %',
      trigger_record.trigger_name, trigger_record.action_timing,
      trigger_record.event_manipulation, trigger_record.action_statement;
  END LOOP;
  
  IF NOT FOUND THEN
    RAISE NOTICE '✅ No triggers on game_history (Edge Functions should call directly)';
  END IF;
END $$;

-- 5. Test function directly
DO $$
DECLARE
  test_user_id UUID;
  before_stats RECORD;
  after_stats RECORD;
  function_worked BOOLEAN := FALSE;
  error_msg TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 5: DIRECT FUNCTION TEST ===';
  
  -- Get test user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found for testing';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing with user: %', test_user_id;
  
  -- Ensure user has stats row
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (test_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get baseline
  SELECT total_games, lifetime_xp, tower_games
  INTO before_stats
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  RAISE NOTICE 'BEFORE: Games: %, XP: %, Tower: %', before_stats.total_games, before_stats.lifetime_xp, before_stats.tower_games;
  
  -- Test function call
  BEGIN
    PERFORM public.update_user_stats_and_level(
      test_user_id,
      'tower',
      50.0,
      'win',
      75.0,
      0
    );
    
    function_worked := TRUE;
    RAISE NOTICE '✅ Function call succeeded';
    
  EXCEPTION WHEN OTHERS THEN
    error_msg := SQLERRM || ' (' || SQLSTATE || ')';
    RAISE NOTICE '❌ Function call failed: %', error_msg;
    function_worked := FALSE;
  END;
  
  -- Check results
  SELECT total_games, lifetime_xp, tower_games
  INTO after_stats
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  RAISE NOTICE 'AFTER: Games: %, XP: %, Tower: %', after_stats.total_games, after_stats.lifetime_xp, after_stats.tower_games;
  
  IF function_worked THEN
    IF after_stats.total_games > before_stats.total_games AND after_stats.lifetime_xp > before_stats.lifetime_xp THEN
      RAISE NOTICE '🎉 FUNCTION WORKS! Stats updated correctly.';
      
      -- Restore for clean test
      UPDATE public.user_level_stats
      SET 
        total_games = before_stats.total_games,
        tower_games = before_stats.tower_games,
        total_wins = GREATEST(0, total_wins - 1),
        tower_wins = GREATEST(0, tower_wins - 1),
        total_wagered = GREATEST(0, total_wagered - 50.0),
        tower_wagered = GREATEST(0, tower_wagered - 50.0),
        total_profit = total_profit - 75.0,
        tower_profit = tower_profit - 75.0,
        lifetime_xp = before_stats.lifetime_xp
      WHERE user_id = test_user_id;
      
    ELSE
      RAISE NOTICE '❌ FUNCTION CALLED BUT STATS NOT UPDATED!';
      RAISE NOTICE '   This means the function exists but has internal issues.';
    END IF;
  END IF;
END $$;

-- 6. Check RLS policies that might block updates
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_record RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 6: RLS POLICY CHECK ===';
  
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class 
  WHERE relname = 'user_level_stats' AND relnamespace = 'public'::regnamespace;
  
  RAISE NOTICE 'RLS enabled on user_level_stats: %', COALESCE(rls_enabled, FALSE);
  
  IF COALESCE(rls_enabled, FALSE) THEN
    FOR policy_record IN
      SELECT policyname, permissive, roles, cmd, qual
      FROM pg_policies 
      WHERE schemaname = 'public' AND tablename = 'user_level_stats'
    LOOP
      RAISE NOTICE 'Policy: % | Roles: % | Command: %', 
        policy_record.policyname, policy_record.roles, policy_record.cmd;
    END LOOP;
  END IF;
END $$;

-- 7. Check function permissions
DO $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 7: FUNCTION PERMISSIONS ===';
  
  -- Check if function is accessible to service_role
  SELECT has_function_privilege('service_role', 'public.update_user_stats_and_level(uuid,text,numeric,text,numeric,integer)', 'execute') INTO has_permission;
  RAISE NOTICE 'service_role execute permission: %', COALESCE(has_permission, FALSE);
  
  SELECT has_function_privilege('authenticated', 'public.update_user_stats_and_level(uuid,text,numeric,text,numeric,integer)', 'execute') INTO has_permission;
  RAISE NOTICE 'authenticated execute permission: %', COALESCE(has_permission, FALSE);
  
  SELECT has_function_privilege('anon', 'public.update_user_stats_and_level(uuid,text,numeric,text,numeric,integer)', 'execute') INTO has_permission;
  RAISE NOTICE 'anon execute permission: %', COALESCE(has_permission, FALSE);
END $$;

-- 8. Simulate Edge Function call pattern
DO $$
DECLARE
  test_user_id UUID;
  before_stats RECORD;
  after_stats RECORD;
  game_inserted BOOLEAN := FALSE;
  stats_called BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== STEP 8: SIMULATE EDGE FUNCTION PATTERN ===';
  
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users for simulation';
    RETURN;
  END IF;
  
  -- Get baseline
  SELECT COALESCE(total_games, 0) as total_games, COALESCE(lifetime_xp, 0) as lifetime_xp
  INTO before_stats
  FROM public.user_level_stats WHERE user_id = test_user_id;
  
  IF before_stats IS NULL THEN
    before_stats := ROW(0, 0);
  END IF;
  
  RAISE NOTICE 'SIMULATION - BEFORE: Games: %, XP: %', before_stats.total_games, before_stats.lifetime_xp;
  
  -- Step 1: Insert into game_history (like Edge Function does)
  BEGIN
    INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, game_data)
    VALUES (test_user_id, 'tower', 30.0, 'win', 45.0, '{"simulation": true}');
    
    game_inserted := TRUE;
    RAISE NOTICE '✅ Game inserted into game_history';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Failed to insert game: % (%)', SQLERRM, SQLSTATE;
  END;
  
  -- Step 2: Call stats function (like Edge Function does after insert)
  IF game_inserted THEN
    BEGIN
      PERFORM public.update_user_stats_and_level(
        test_user_id,
        'tower',
        30.0,
        'win',
        45.0,
        0
      );
      
      stats_called := TRUE;
      RAISE NOTICE '✅ Stats function called';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '❌ Stats function failed: % (%)', SQLERRM, SQLSTATE;
    END;
  END IF;
  
  -- Check final results
  SELECT COALESCE(total_games, 0) as total_games, COALESCE(lifetime_xp, 0) as lifetime_xp
  INTO after_stats
  FROM public.user_level_stats WHERE user_id = test_user_id;
  
  IF after_stats IS NULL THEN
    after_stats := ROW(0, 0);
  END IF;
  
  RAISE NOTICE 'SIMULATION - AFTER: Games: %, XP: %', after_stats.total_games, after_stats.lifetime_xp;
  
  -- Analyze results
  IF game_inserted AND stats_called THEN
    IF after_stats.total_games > before_stats.total_games AND after_stats.lifetime_xp > before_stats.lifetime_xp THEN
      RAISE NOTICE '🎉 SIMULATION SUCCESS! Both game_history and stats updated.';
    ELSE
      RAISE NOTICE '❌ SIMULATION FAILED! Function called but stats not updated.';
      RAISE NOTICE '   This indicates an issue INSIDE the update_user_stats_and_level function.';
    END IF;
  ELSE
    RAISE NOTICE '❌ SIMULATION FAILED! Could not complete Edge Function pattern.';
  END IF;
  
  -- Cleanup
  DELETE FROM public.game_history WHERE user_id = test_user_id AND game_data->>'simulation' = 'true';
  
  IF after_stats.total_games > before_stats.total_games THEN
    UPDATE public.user_level_stats
    SET 
      total_games = before_stats.total_games,
      tower_games = GREATEST(0, tower_games - 1),
      total_wins = GREATEST(0, total_wins - 1),
      tower_wins = GREATEST(0, tower_wins - 1),
      total_wagered = GREATEST(0, total_wagered - 30.0),
      tower_wagered = GREATEST(0, tower_wagered - 30.0),
      total_profit = total_profit - 45.0,
      tower_profit = tower_profit - 45.0,
      lifetime_xp = before_stats.lifetime_xp
    WHERE user_id = test_user_id;
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== 🔍 DIAGNOSTIC COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'ANALYSIS CHECKLIST:';
  RAISE NOTICE '1. Are games being recorded in game_history?';
  RAISE NOTICE '2. Do user_level_stats rows exist?';
  RAISE NOTICE '3. Does update_user_stats_and_level function exist?';
  RAISE NOTICE '4. Are there any triggers interfering?';
  RAISE NOTICE '5. Does the function work when called directly?';
  RAISE NOTICE '6. Are there RLS policies blocking updates?';
  RAISE NOTICE '7. Does the function have proper permissions?';
  RAISE NOTICE '8. Does the full Edge Function pattern work?';
  RAISE NOTICE '';
  RAISE NOTICE 'The failing step will show you exactly what is broken.';
END $$;

ROLLBACK;