-- 🚨 FORCE STATS FIX - Manual verification and fix
BEGIN;

DO $$
BEGIN
  RAISE NOTICE '=== 🚨 FORCE STATS FIX ===';
  RAISE NOTICE 'Manually testing and fixing the stats system...';
END $$;

-- 1. Verify current trigger state
DO $$
DECLARE
  trigger_count INTEGER;
  trigger_name TEXT;
BEGIN
  RAISE NOTICE '=== STEP 1: TRIGGER VERIFICATION ===';
  
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers 
  WHERE event_object_table = 'game_history' 
  AND event_object_schema = 'public';
  
  RAISE NOTICE 'Triggers on game_history: %', trigger_count;
  
  -- Get trigger name
  SELECT t.trigger_name INTO trigger_name
  FROM information_schema.triggers t
  WHERE t.event_object_table = 'game_history' 
  AND t.event_object_schema = 'public'
  LIMIT 1;
  
  IF trigger_name IS NOT NULL THEN
    RAISE NOTICE 'Found trigger: %', trigger_name;
  ELSE
    RAISE NOTICE '❌ NO TRIGGER FOUND!';
  END IF;
END $$;

-- 2. Verify function callable
DO $$
DECLARE
  test_user_id UUID;
  result RECORD;
BEGIN
  RAISE NOTICE '=== STEP 2: FUNCTION TEST ===';
  
  -- Get test user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found for testing';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing update_user_stats_and_level with user: %', test_user_id;
  
  -- Direct function call test
  BEGIN
    SELECT * INTO result
    FROM public.update_user_stats_and_level(
      test_user_id, 
      'tower'::text, 
      15.0::numeric, 
      'win'::text, 
      22.5::numeric, 
      0::integer
    );
    
    RAISE NOTICE '✅ Function callable! Result: leveled_up=%, new_level=%, old_level=%', 
      result.leveled_up, result.new_level, result.old_level;
      
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Function call failed: % (%)', SQLERRM, SQLSTATE;
  END;
END $$;

-- 3. FORCE RECREATE the trigger system
DROP TRIGGER IF EXISTS handle_game_completion_trigger ON public.game_history CASCADE;

-- 4. Recreate the trigger function with EXTENSIVE logging
CREATE OR REPLACE FUNCTION public.handle_game_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  user_name TEXT;
  stats_result RECORD;
  streak_len INTEGER := 0;
  game_action TEXT := 'completed';
BEGIN
  -- FORCE LOG EVERY TRIGGER ACTIVATION
  RAISE NOTICE '🔥 TRIGGER FIRED! User: %, Game: %, Bet: %, Result: %, Profit: %', 
    NEW.user_id, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit;
  
  -- Get username (non-critical)
  BEGIN
    SELECT username INTO user_name FROM public.profiles WHERE id = NEW.user_id;
    RAISE NOTICE '👤 Username found: %', COALESCE(user_name, 'NULL');
  EXCEPTION WHEN OTHERS THEN
    user_name := 'Unknown';
    RAISE NOTICE '⚠️ Username lookup failed: %', SQLERRM;
  END;
  
  -- === CRITICAL STATS UPDATE ===
  BEGIN
    RAISE NOTICE '📊 CALLING update_user_stats_and_level...';
    
    SELECT * INTO stats_result 
    FROM public.update_user_stats_and_level(
      NEW.user_id, 
      NEW.game_type, 
      NEW.bet_amount, 
      NEW.result, 
      NEW.profit,
      COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0)
    );
    
    RAISE NOTICE '🎉 STATS UPDATE SUCCESS! User: %, Leveled up: %, New level: %, Old level: %', 
      NEW.user_id, stats_result.leveled_up, stats_result.new_level, stats_result.old_level;
      
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '💥 STATS UPDATE ERROR: % (%)', SQLERRM, SQLSTATE;
    -- Continue execution - don't break games
  END;
  
  -- === LIVE FEED (Secondary priority) ===
  BEGIN
    IF NEW.game_type = 'coinflip' THEN
      -- Coinflip special logic
      IF NEW.game_data IS NOT NULL THEN
        game_action := COALESCE(NEW.game_data->>'action', 'completed');
        
        IF game_action IN ('lost', 'cash_out') THEN
          streak_len := COALESCE((NEW.game_data->>'streak_length')::INTEGER, 0);
          
          INSERT INTO public.live_bet_feed (
            user_id, username, game_type, bet_amount, result, profit, 
            multiplier, game_data, streak_length, action
          ) VALUES (
            NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit, 
            CASE WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC ELSE NULL END,
            NEW.game_data, streak_len, game_action
          );
          
          RAISE NOTICE '📡 Live feed: Added coinflip %', game_action;
        END IF;
      END IF;
    ELSE
      -- All other games
      INSERT INTO public.live_bet_feed (
        user_id, username, game_type, bet_amount, result, profit, 
        multiplier, game_data
      ) VALUES (
        NEW.user_id, user_name, NEW.game_type, NEW.bet_amount, NEW.result, NEW.profit, 
        CASE WHEN NEW.game_data ? 'multiplier' THEN (NEW.game_data->>'multiplier')::NUMERIC ELSE NULL END,
        NEW.game_data
      );
      
      RAISE NOTICE '📡 Live feed: Added % game', NEW.game_type;
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Live feed error (non-critical): % (%)', SQLERRM, SQLSTATE;
  END;
  
  RAISE NOTICE '✅ TRIGGER COMPLETED for user %', NEW.user_id;
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '💥 CRITICAL TRIGGER ERROR: % (%)', SQLERRM, SQLSTATE;
  RETURN NEW; -- Always return NEW to avoid breaking games
END;
$function$;

-- 5. Create the trigger with FORCE flag
CREATE TRIGGER handle_game_completion_trigger
  AFTER INSERT ON public.game_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_game_completion();

-- 6. Grant all permissions
GRANT EXECUTE ON FUNCTION public.handle_game_completion() TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(uuid, text, numeric, text, numeric, integer) TO anon, authenticated, service_role, postgres;

DO $$
BEGIN
  RAISE NOTICE '✅ STEP 3: Recreated trigger and granted permissions';
END $$;

-- 7. MANDATORY REAL TEST
DO $$
DECLARE
  test_user_id UUID;
  before_stats RECORD;
  after_stats RECORD;
  test_game_id UUID;
  test_successful BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '=== STEP 4: MANDATORY REAL TEST ===';
  
  -- Get test user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found for testing';
    RETURN;
  END IF;
  
  RAISE NOTICE '🎯 Testing with user: %', test_user_id;
  
  -- Get baseline stats (create row if doesn't exist)
  SELECT 
    COALESCE(total_games, 0) as total_games,
    COALESCE(tower_games, 0) as tower_games,
    COALESCE(lifetime_xp, 0) as lifetime_xp,
    COALESCE(current_level, 1) as current_level
  INTO before_stats
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  -- If no stats row, insert one
  IF before_stats IS NULL THEN
    INSERT INTO public.user_level_stats (user_id) VALUES (test_user_id)
    ON CONFLICT (user_id) DO NOTHING;
    
    SELECT 
      COALESCE(total_games, 0) as total_games,
      COALESCE(tower_games, 0) as tower_games,
      COALESCE(lifetime_xp, 0) as lifetime_xp,
      COALESCE(current_level, 1) as current_level
    INTO before_stats
    FROM public.user_level_stats 
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '📊 Created new stats row for user';
  END IF;
  
  RAISE NOTICE '📊 BEFORE: Total: %, Tower: %, XP: %, Level: %', 
    before_stats.total_games, before_stats.tower_games, before_stats.lifetime_xp, before_stats.current_level;
  
  -- Insert test game (this MUST trigger the function)
  RAISE NOTICE '🎮 Inserting test game...';
  
  INSERT INTO public.game_history (user_id, game_type, bet_amount, result, profit, game_data)
  VALUES (test_user_id, 'tower', 20.00, 'win', 30.00, '{"difficulty": "easy", "level_reached": 4, "test_marker": true}')
  RETURNING id INTO test_game_id;
  
  RAISE NOTICE '🎮 Inserted game ID: % - watching for trigger output...', test_game_id;
  
  -- Small delay to ensure trigger completes
  PERFORM pg_sleep(0.2);
  
  -- Get updated stats
  SELECT 
    COALESCE(total_games, 0) as total_games,
    COALESCE(tower_games, 0) as tower_games,
    COALESCE(lifetime_xp, 0) as lifetime_xp,
    COALESCE(current_level, 1) as current_level
  INTO after_stats
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  RAISE NOTICE '📊 AFTER: Total: %, Tower: %, XP: %, Level: %', 
    after_stats.total_games, after_stats.tower_games, after_stats.lifetime_xp, after_stats.current_level;
  
  -- Validate results
  IF after_stats.total_games > before_stats.total_games AND 
     after_stats.tower_games > before_stats.tower_games AND
     after_stats.lifetime_xp > before_stats.lifetime_xp THEN
    
    test_successful := TRUE;
    RAISE NOTICE '🎉🎉🎉 TEST SUCCESS! Stats properly updated!';
    RAISE NOTICE '   Total games: % → % (+%)', 
      before_stats.total_games, after_stats.total_games, (after_stats.total_games - before_stats.total_games);
    RAISE NOTICE '   Tower games: % → % (+%)', 
      before_stats.tower_games, after_stats.tower_games, (after_stats.tower_games - before_stats.tower_games);
    RAISE NOTICE '   Lifetime XP: % → % (+%)', 
      before_stats.lifetime_xp, after_stats.lifetime_xp, (after_stats.lifetime_xp - before_stats.lifetime_xp);
    
  ELSE
    RAISE NOTICE '❌❌❌ TEST FAILED! Stats NOT updated!';
    RAISE NOTICE '   Total games: % → % (expected increase)', before_stats.total_games, after_stats.total_games;
    RAISE NOTICE '   Tower games: % → % (expected increase)', before_stats.tower_games, after_stats.tower_games;
    RAISE NOTICE '   Lifetime XP: % → % (expected increase)', before_stats.lifetime_xp, after_stats.lifetime_xp;
  END IF;
  
  -- Clean up test data
  DELETE FROM public.game_history WHERE id = test_game_id;
  DELETE FROM public.live_bet_feed WHERE user_id = test_user_id AND game_data->>'test_marker' = 'true';
  
  -- Restore stats if test passed
  IF test_successful THEN
    UPDATE public.user_level_stats 
    SET 
      total_games = before_stats.total_games,
      tower_games = before_stats.tower_games,
      lifetime_xp = before_stats.lifetime_xp,
      current_level = before_stats.current_level,
      -- Restore related stats
      tower_wagered = GREATEST(0, tower_wagered - 20.00),
      tower_profit = tower_profit - 30.00,
      total_wagered = GREATEST(0, total_wagered - 20.00),
      total_profit = total_profit - 30.00,
      total_wins = GREATEST(0, total_wins - 1),
      tower_wins = GREATEST(0, tower_wins - 1),
      updated_at = NOW()
    WHERE user_id = test_user_id;
    
    RAISE NOTICE '🧹 Test cleanup completed - stats restored';
  END IF;
END $$;

-- 8. Final verification
DO $$
DECLARE
  trigger_exists BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '=== STEP 5: FINAL VERIFICATION ===';
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.triggers 
    WHERE event_object_table = 'game_history' 
    AND event_object_schema = 'public'
    AND trigger_name = 'handle_game_completion_trigger'
  ) INTO trigger_exists;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'handle_game_completion'
  ) INTO function_exists;
  
  RAISE NOTICE 'Trigger exists: %, Function exists: %', trigger_exists, function_exists;
  
  IF trigger_exists AND function_exists THEN
    RAISE NOTICE '✅ System verification PASSED';
  ELSE
    RAISE NOTICE '❌ System verification FAILED';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== 🚨 FORCE STATS FIX COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE 'If the test above showed SUCCESS, your stats system is now working!';
  RAISE NOTICE 'If it showed FAILED, there may be a deeper database issue.';
  RAISE NOTICE '';
  RAISE NOTICE 'The trigger now has EXTENSIVE logging - you should see detailed';
  RAISE NOTICE 'output in the logs when games are played.';
END $$;

COMMIT;