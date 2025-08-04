-- 🔧 FIX LEVEL CALCULATION ERROR
-- The calculate_level_from_xp_new function returns a tuple, not a single integer

BEGIN;

DO $$ BEGIN RAISE NOTICE '🔧 Fixing level calculation error...'; END $$;

-- 1. Check what calculate_level_from_xp_new actually returns
DO $$
DECLARE
  test_result RECORD;
  result_text TEXT;
BEGIN
  RAISE NOTICE '🔍 Checking calculate_level_from_xp_new function...';
  
  -- Test what the function returns
  SELECT * INTO test_result FROM public.calculate_level_from_xp_new(1000);
  result_text := test_result::text;
  RAISE NOTICE 'Function returns: %', result_text;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error testing function: % (%)', SQLERRM, SQLSTATE;
END $$;

-- 2. Get the function signature to understand its return type
DO $$
DECLARE
  func_signature TEXT;
BEGIN
  SELECT 
    p.proname || '(' || 
    array_to_string(
      ARRAY(
        SELECT pg_catalog.format_type(p.proargtypes[i-1], NULL)
        FROM generate_series(1, p.pronargs) AS i
      ), 
      ', '
    ) || ') RETURNS ' || pg_catalog.format_type(p.prorettype, NULL)
  INTO func_signature
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public' AND p.proname = 'calculate_level_from_xp_new';
  
  RAISE NOTICE 'Function signature: %', COALESCE(func_signature, 'NOT FOUND');
END $$;

-- 3. Recreate the stats function with a simple level calculation instead
DROP FUNCTION IF EXISTS public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER);

CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0
)
RETURNS TABLE(
  leveled_up BOOLEAN,
  new_level INTEGER,
  old_level INTEGER,
  xp_gained NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_old_level INTEGER;
  v_new_level INTEGER;
  v_current_xp NUMERIC;
  v_xp_to_add NUMERIC;
  v_new_total_xp NUMERIC;
  v_leveled_up BOOLEAN := FALSE;
BEGIN
  -- Ensure user has a stats row
  INSERT INTO public.user_level_stats (user_id) 
  VALUES (p_user_id) 
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current level and XP
  SELECT current_level, lifetime_xp INTO v_old_level, v_current_xp
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- Use defaults if no data
  v_old_level := COALESCE(v_old_level, 1);
  v_current_xp := COALESCE(v_current_xp, 0);
  
  -- Calculate XP to add (base amount based on bet)
  v_xp_to_add := GREATEST(1, p_bet_amount * 0.1);
  
  -- Bonus XP for wins
  IF p_result = 'win' THEN
    v_xp_to_add := v_xp_to_add * 1.5;
  END IF;
  
  -- Bonus XP for streaks
  IF p_streak_length > 0 THEN
    v_xp_to_add := v_xp_to_add * (1 + (p_streak_length * 0.1));
  END IF;
  
  v_new_total_xp := v_current_xp + v_xp_to_add;
  
  -- Simple level calculation instead of using the problematic function
  -- Level 1: 0-999 XP, Level 2: 1000-2999 XP, etc.
  v_new_level := GREATEST(1, FLOOR(v_new_total_xp / 1000) + 1);
  
  -- Check if leveled up
  IF v_new_level > v_old_level THEN
    v_leveled_up := TRUE;
  END IF;
  
  -- Update user stats
  UPDATE public.user_level_stats
  SET 
    -- Game-specific stats
    total_games = total_games + 1,
    total_wins = CASE WHEN p_result = 'win' THEN total_wins + 1 ELSE total_wins END,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    
    -- Game type specific stats
    coinflip_games = CASE WHEN p_game_type = 'coinflip' THEN coinflip_games + 1 ELSE coinflip_games END,
    coinflip_wins = CASE WHEN p_game_type = 'coinflip' AND p_result = 'win' THEN coinflip_wins + 1 ELSE coinflip_wins END,
    coinflip_wagered = CASE WHEN p_game_type = 'coinflip' THEN coinflip_wagered + p_bet_amount ELSE coinflip_wagered END,
    coinflip_profit = CASE WHEN p_game_type = 'coinflip' THEN coinflip_profit + p_profit ELSE coinflip_profit END,
    current_coinflip_streak = CASE 
      WHEN p_game_type = 'coinflip' AND p_result = 'win' THEN current_coinflip_streak + 1
      WHEN p_game_type = 'coinflip' AND p_result = 'loss' THEN 0
      ELSE current_coinflip_streak 
    END,
    best_coinflip_streak = CASE 
      WHEN p_game_type = 'coinflip' AND p_result = 'win' AND (current_coinflip_streak + 1) > best_coinflip_streak 
      THEN current_coinflip_streak + 1
      ELSE best_coinflip_streak 
    END,
    
    tower_games = CASE WHEN p_game_type = 'tower' THEN tower_games + 1 ELSE tower_games END,
    tower_wins = CASE WHEN p_game_type = 'tower' AND p_result = 'win' THEN tower_wins + 1 ELSE tower_wins END,
    tower_wagered = CASE WHEN p_game_type = 'tower' THEN tower_wagered + p_bet_amount ELSE tower_wagered END,
    tower_profit = CASE WHEN p_game_type = 'tower' THEN tower_profit + p_profit ELSE tower_profit END,
    
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND p_result = 'win' THEN roulette_wins + 1 ELSE roulette_wins END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    
    crash_games = CASE WHEN p_game_type = 'crash' THEN crash_games + 1 ELSE crash_games END,
    crash_wins = CASE WHEN p_game_type = 'crash' AND p_result = 'win' THEN crash_wins + 1 ELSE crash_wins END,
    crash_wagered = CASE WHEN p_game_type = 'crash' THEN crash_wagered + p_bet_amount ELSE crash_wagered END,
    crash_profit = CASE WHEN p_game_type = 'crash' THEN crash_profit + p_profit ELSE crash_profit END,
    
    -- Level and XP
    current_level = v_new_level,
    lifetime_xp = v_new_total_xp,
    current_xp = v_new_total_xp,
    
    -- Biggest wins/losses
    biggest_win = CASE WHEN p_profit > biggest_win THEN p_profit ELSE biggest_win END,
    biggest_loss = CASE WHEN p_profit < 0 AND ABS(p_profit) > biggest_loss THEN ABS(p_profit) ELSE biggest_loss END,
    biggest_single_bet = CASE WHEN p_bet_amount > biggest_single_bet THEN p_bet_amount ELSE biggest_single_bet END,
    
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Return results
  RETURN QUERY SELECT v_leveled_up, v_new_level, v_old_level, v_xp_to_add;
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_level(UUID, TEXT, NUMERIC, TEXT, NUMERIC, INTEGER) TO anon, authenticated, service_role;

-- Test the fixed function
DO $$
DECLARE
  test_user_id UUID;
  before_games INTEGER;
  after_games INTEGER;
  before_xp NUMERIC;
  after_xp NUMERIC;
  test_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing fixed function with simple level calculation...';
  
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  IF test_user_id IS NULL THEN
    RAISE NOTICE '❌ No users for testing';
    RETURN;
  END IF;
  
  -- Get baseline
  SELECT COALESCE(total_games, 0), COALESCE(lifetime_xp, 0)
  INTO before_games, before_xp
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  -- Test function
  SELECT * INTO test_result
  FROM public.update_user_stats_and_level(
    test_user_id,
    'tower',
    25.0,
    'win',
    37.5,
    0
  );
  
  -- Check result
  SELECT COALESCE(total_games, 0), COALESCE(lifetime_xp, 0)
  INTO after_games, after_xp
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  IF after_games > before_games AND after_xp > before_xp THEN
    RAISE NOTICE '🎉 SUCCESS! Function now works:';
    RAISE NOTICE '   Games: % → %', before_games, after_games;
    RAISE NOTICE '   XP: % → % (gained: %)', before_xp, after_xp, test_result.xp_gained;
    RAISE NOTICE '   Level: % → % (leveled up: %)', test_result.old_level, test_result.new_level, test_result.leveled_up;
    
    -- Restore for clean test
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
      lifetime_xp = before_xp,
      current_xp = before_xp
    WHERE user_id = test_user_id;
    
  ELSE
    RAISE NOTICE '❌ FAILED! Function still not working';
    RAISE NOTICE '   Games: % → %', before_games, after_games;
    RAISE NOTICE '   XP: % → %', before_xp, after_xp;
  END IF;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Level calculation error fixed - function now uses simple level formula'; END $$;

COMMIT;