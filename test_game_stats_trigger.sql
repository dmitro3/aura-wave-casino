-- 🧪 SIMPLE GAME STATS TRIGGER TEST
-- Run this in Supabase SQL Editor to test if the trigger is working

DO $$
DECLARE
  test_user_id UUID;
  stats_before RECORD;
  stats_after RECORD;
  game_id UUID;
BEGIN
  RAISE NOTICE '=== 🧪 STARTING GAME STATS TRIGGER TEST ===';
  
  -- Get a real user ID from existing profiles
  SELECT id INTO test_user_id 
  FROM public.profiles 
  LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users found in profiles table!';
    RETURN;
  END IF;
  
  RAISE NOTICE '📝 Testing with user ID: %', test_user_id;
  
  -- Get stats before the test
  SELECT * INTO stats_before 
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  IF stats_before IS NULL THEN
    RAISE NOTICE '📊 No existing stats found, will create new record';
    stats_before.total_games := 0;
    stats_before.tower_games := 0;
    stats_before.total_wagered := 0;
    stats_before.total_profit := 0;
  ELSE
    RAISE NOTICE '📊 Current stats - Games: %, Tower: %, Wagered: %, Profit: %', 
      stats_before.total_games, stats_before.tower_games, 
      stats_before.total_wagered, stats_before.total_profit;
  END IF;
  
  -- Insert a test game into game_history to trigger the function
  INSERT INTO public.game_history (
    user_id, 
    game_type, 
    bet_amount, 
    result, 
    profit,
    game_data
  ) VALUES (
    test_user_id,
    'tower',
    25.00,
    'win',
    50.00,
    '{"test": true, "floors_climbed": 3}'
  ) RETURNING id INTO game_id;
  
  RAISE NOTICE '🎮 Inserted test game with ID: %', game_id;
  
  -- Wait a moment for trigger to process
  PERFORM pg_sleep(1);
  
  -- Get stats after the test
  SELECT * INTO stats_after 
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  IF stats_after IS NULL THEN
    RAISE NOTICE '❌ TRIGGER FAILED: No stats record created after game insertion!';
  ELSE
    RAISE NOTICE '📊 Updated stats - Games: %, Tower: %, Wagered: %, Profit: %', 
      stats_after.total_games, stats_after.tower_games, 
      stats_after.total_wagered, stats_after.total_profit;
    
    -- Check if stats were actually updated
    IF stats_after.total_games > COALESCE(stats_before.total_games, 0) THEN
      RAISE NOTICE '✅ SUCCESS: total_games increased from % to %', 
        COALESCE(stats_before.total_games, 0), stats_after.total_games;
    ELSE
      RAISE NOTICE '❌ FAILED: total_games did not increase! Before: %, After: %', 
        COALESCE(stats_before.total_games, 0), stats_after.total_games;
    END IF;
    
    IF stats_after.tower_games > COALESCE(stats_before.tower_games, 0) THEN
      RAISE NOTICE '✅ SUCCESS: tower_games increased from % to %', 
        COALESCE(stats_before.tower_games, 0), stats_after.tower_games;
    ELSE
      RAISE NOTICE '❌ FAILED: tower_games did not increase! Before: %, After: %', 
        COALESCE(stats_before.tower_games, 0), stats_after.tower_games;
    END IF;
    
    IF stats_after.total_wagered > COALESCE(stats_before.total_wagered, 0) THEN
      RAISE NOTICE '✅ SUCCESS: total_wagered increased from % to %', 
        COALESCE(stats_before.total_wagered, 0), stats_after.total_wagered;
    ELSE
      RAISE NOTICE '❌ FAILED: total_wagered did not increase! Before: %, After: %', 
        COALESCE(stats_before.total_wagered, 0), stats_after.total_wagered;
    END IF;
  END IF;
  
  -- Clean up the test game
  DELETE FROM public.game_history WHERE id = game_id;
  RAISE NOTICE '🧹 Cleaned up test game entry';
  
  -- Restore original stats if they existed
  IF stats_before.total_games IS NOT NULL THEN
    UPDATE public.user_level_stats 
    SET 
      total_games = stats_before.total_games,
      tower_games = stats_before.tower_games,
      total_wagered = stats_before.total_wagered,
      total_profit = stats_before.total_profit,
      tower_wagered = stats_before.tower_wagered,
      tower_profit = stats_before.tower_profit
    WHERE user_id = test_user_id;
    RAISE NOTICE '🔄 Restored original stats';
  ELSE
    -- If no stats existed before, delete the created record
    DELETE FROM public.user_level_stats WHERE user_id = test_user_id;
    RAISE NOTICE '🔄 Removed test stats record';
  END IF;
  
  RAISE NOTICE '=== 🧪 GAME STATS TRIGGER TEST COMPLETE ===';
  
END $$;