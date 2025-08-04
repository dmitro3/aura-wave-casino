-- 🧪 SIMPLE FUNCTION TEST
-- Test if update_user_stats_and_level works

DO $$
DECLARE
  test_user_id UUID;
  before_games INTEGER;
  after_games INTEGER;
  before_xp NUMERIC;
  after_xp NUMERIC;
  test_result TEXT := 'UNKNOWN';
BEGIN
  -- Get a test user
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found for testing';
  END IF;
  
  -- Ensure user has stats row
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (test_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get baseline stats
  SELECT COALESCE(total_games, 0), COALESCE(lifetime_xp, 0)
  INTO before_games, before_xp
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  -- Test the function
  BEGIN
    PERFORM public.update_user_stats_and_level(
      test_user_id,
      'tower',
      25.0,
      'win',
      37.5,
      0
    );
    
    -- Check if stats changed
    SELECT COALESCE(total_games, 0), COALESCE(lifetime_xp, 0)
    INTO after_games, after_xp
    FROM public.user_level_stats 
    WHERE user_id = test_user_id;
    
    IF after_games > before_games AND after_xp > before_xp THEN
      test_result := 'SUCCESS - Function works!';
      
      -- Restore original stats
      UPDATE public.user_level_stats
      SET 
        total_games = before_games,
        tower_games = GREATEST(0, tower_games - 1),
        total_wins = GREATEST(0, total_wins - 1),
        tower_wins = GREATEST(0, tower_wins - 1),
        total_wagered = GREATEST(0, total_wagered - 25.0),
        tower_wagered = GREATEST(0, tower_wagered - 25.0),
        total_profit = total_profit - 37.5,
        tower_profit = tower_profit - 37.5,
        lifetime_xp = before_xp
      WHERE user_id = test_user_id;
      
    ELSE
      test_result := 'FAILED - Function called but stats not updated';
    END IF;
    
  EXCEPTION WHEN OTHERS THEN
    test_result := 'ERROR - ' || SQLERRM;
  END;
  
  -- Insert result into a temp table we can query
  CREATE TEMP TABLE IF NOT EXISTS test_results (
    test_name TEXT,
    result TEXT,
    before_games INTEGER,
    after_games INTEGER,
    before_xp NUMERIC,
    after_xp NUMERIC
  );
  
  INSERT INTO test_results VALUES (
    'update_user_stats_and_level test',
    test_result,
    before_games,
    after_games,
    before_xp,
    after_xp
  );
  
END $$;

-- Show the results
SELECT * FROM test_results;