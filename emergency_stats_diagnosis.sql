-- 🚨 EMERGENCY STATS DIAGNOSIS
-- Run this in Supabase SQL Editor to see what's actually happening

BEGIN;

DO $$
BEGIN
  RAISE NOTICE '=== 🚨 EMERGENCY STATS DIAGNOSIS ===';
  RAISE NOTICE 'Checking if games are being recorded and triggers firing...';
END $$;

-- 1. Check if games are being recorded in game_history
DO $$
DECLARE
  game_count INTEGER;
  recent_game RECORD;
BEGIN
  RAISE NOTICE '=== STEP 1: GAME HISTORY CHECK ===';
  
  -- Count total games
  SELECT COUNT(*) INTO game_count FROM public.game_history;
  RAISE NOTICE 'Total games in history: %', game_count;
  
  -- Count recent games (last 24 hours)
  SELECT COUNT(*) INTO game_count 
  FROM public.game_history 
  WHERE created_at > NOW() - INTERVAL '24 hours';
  RAISE NOTICE 'Games in last 24 hours: %', game_count;
  
  -- Show most recent games
  FOR recent_game IN 
    SELECT user_id, game_type, bet_amount, result, profit, created_at
    FROM public.game_history 
    ORDER BY created_at DESC 
    LIMIT 5
  LOOP
    RAISE NOTICE 'Recent game: % | % | $% | % | $% | %',
      recent_game.user_id, recent_game.game_type, recent_game.bet_amount, 
      recent_game.result, recent_game.profit, recent_game.created_at;
  END LOOP;
END $$;

-- 2. Check user_level_stats table
DO $$
DECLARE
  stats_count INTEGER;
  profile_count INTEGER;
  recent_update RECORD;
BEGIN
  RAISE NOTICE '=== STEP 2: USER STATS CHECK ===';
  
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO stats_count FROM public.user_level_stats;
  
  RAISE NOTICE 'Profiles: %, Stats rows: %', profile_count, stats_count;
  
  -- Check recent updates
  SELECT COUNT(*) INTO stats_count 
  FROM public.user_level_stats 
  WHERE updated_at > NOW() - INTERVAL '24 hours';
  RAISE NOTICE 'Stats updated in last 24 hours: %', stats_count;
  
  -- Show recent stats updates
  FOR recent_update IN 
    SELECT user_id, current_level, lifetime_xp, total_games, updated_at
    FROM public.user_level_stats 
    ORDER BY updated_at DESC 
    LIMIT 3
  LOOP
    RAISE NOTICE 'Recent stats: % | Level % | XP % | Games % | %',
      recent_update.user_id, recent_update.current_level, recent_update.lifetime_xp, 
      recent_update.total_games, recent_update.updated_at;
  END LOOP;
END $$;

-- 3. Check triggers
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '=== STEP 3: TRIGGER CHECK ===';
  
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
    RAISE NOTICE '❌ NO TRIGGERS FOUND ON GAME_HISTORY!';
  END IF;
END $$;

-- 4. Test if trigger fires by manually inserting
DO $$
DECLARE
  test_user_id UUID;
  before_count INTEGER;
  after_count INTEGER;
  test_game_id UUID;
BEGIN
  RAISE NOTICE '=== STEP 4: MANUAL TRIGGER TEST ===';
  
  -- Get a user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing trigger with user: %', test_user_id;
  
  -- Count stats before
  SELECT COALESCE(total_games, 0) INTO before_count
  FROM public.user_level_stats WHERE user_id = test_user_id;
  
  IF before_count IS NULL THEN
    before_count := 0;
  END IF;
  
  RAISE NOTICE 'Games before insert: %', before_count;
  
  -- Manual insert into game_history
  INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, game_data)
  VALUES (test_user_id, 'tower', 25.00, 'win', 37.50, '{"manual_test": true}')
  RETURNING id INTO test_game_id;
  
  RAISE NOTICE 'Inserted test game ID: %', test_game_id;
  
  -- Wait a moment
  PERFORM pg_sleep(0.5);
  
  -- Count stats after
  SELECT COALESCE(total_games, 0) INTO after_count
  FROM public.user_level_stats WHERE user_id = test_user_id;
  
  IF after_count IS NULL THEN
    after_count := 0;
  END IF;
  
  RAISE NOTICE 'Games after insert: %', after_count;
  
  IF after_count > before_count THEN
    RAISE NOTICE '✅ TRIGGER WORKED! Stats updated from % to %', before_count, after_count;
  ELSE
    RAISE NOTICE '❌ TRIGGER FAILED! Stats unchanged: %', before_count;
  END IF;
  
  -- Cleanup
  DELETE FROM public.game_history WHERE id = test_game_id;
  
  -- Restore stats if they were updated
  IF after_count > before_count THEN
    UPDATE public.user_level_stats 
    SET total_games = before_count,
        tower_games = GREATEST(0, tower_games - 1),
        total_wins = GREATEST(0, total_wins - 1),
        tower_wins = GREATEST(0, tower_wins - 1),
        total_wagered = GREATEST(0, total_wagered - 25.00),
        tower_wagered = GREATEST(0, tower_wagered - 25.00),
        total_profit = total_profit - 37.50,
        tower_profit = tower_profit - 37.50,
        lifetime_xp = GREATEST(0, lifetime_xp - 25)
    WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Cleaned up test stats';
  END IF;
END $$;

-- 5. Check function permissions and existence
DO $$
DECLARE
  func_exists BOOLEAN;
  perm_record RECORD;
BEGIN
  RAISE NOTICE '=== STEP 5: FUNCTION PERMISSIONS ===';
  
  -- Check if functions exist
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'handle_game_completion'
  ) INTO func_exists;
  RAISE NOTICE 'handle_game_completion exists: %', func_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_user_stats_and_level'
  ) INTO func_exists;
  RAISE NOTICE 'update_user_stats_and_level exists: %', func_exists;
  
  -- Check permissions (simplified)
  FOR perm_record IN
    SELECT routine_name, specific_name
    FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name IN ('handle_game_completion', 'update_user_stats_and_level')
  LOOP
    RAISE NOTICE 'Function: % (ID: %)', perm_record.routine_name, perm_record.specific_name;
  END LOOP;
END $$;

-- 6. Check RLS policies on user_level_stats
DO $$
DECLARE
  rls_enabled BOOLEAN;
  policy_record RECORD;
BEGIN
  RAISE NOTICE '=== STEP 6: RLS POLICY CHECK ===';
  
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class 
  WHERE relname = 'user_level_stats' AND relnamespace = 'public'::regnamespace;
  
  RAISE NOTICE 'RLS enabled on user_level_stats: %', COALESCE(rls_enabled, false);
  
  -- Check policies
  FOR policy_record IN
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'user_level_stats'
  LOOP
    RAISE NOTICE 'Policy: % | Roles: % | Command: % | Permissive: %',
      policy_record.policyname, policy_record.roles, policy_record.cmd, policy_record.permissive;
  END LOOP;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No RLS policies found on user_level_stats';
  END IF;
END $$;

-- 7. Direct function test
DO $$
DECLARE
  test_user_id UUID;
  func_result RECORD;
BEGIN
  RAISE NOTICE '=== STEP 7: DIRECT FUNCTION TEST ===';
  
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users for function test';
    RETURN;
  END IF;
  
  BEGIN
    -- Test direct function call
    SELECT * INTO func_result
    FROM public.update_user_stats_and_level(
      test_user_id, 'tower', 10.0, 'win', 15.0, 0
    );
    
    RAISE NOTICE '✅ Direct function call SUCCESS!';
    RAISE NOTICE 'Result: leveled_up=%, new_level=%, old_level=%',
      func_result.leveled_up, func_result.new_level, func_result.old_level;
      
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Direct function call FAILED: % (%)', SQLERRM, SQLSTATE;
  END;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== 🚨 EMERGENCY DIAGNOSIS COMPLETE ===';
  RAISE NOTICE 'Review the output above to identify the issue:';
  RAISE NOTICE '1. Are games being recorded in game_history?';
  RAISE NOTICE '2. Do user_level_stats rows exist?';
  RAISE NOTICE '3. Are triggers present and firing?';
  RAISE NOTICE '4. Are functions callable?';
  RAISE NOTICE '5. Are there RLS policy issues?';
END $$;

ROLLBACK;