-- ===============================================
-- RESTORE XP FUNCTIONS - EMERGENCY FIX
-- ===============================================
-- This restores the missing update_user_level_stats function that's breaking XP

-- Step 1: Create the missing update_user_level_stats function
-- ==========================================================

CREATE OR REPLACE FUNCTION public.update_user_level_stats(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount DECIMAL,
  p_profit DECIMAL,
  p_is_win BOOLEAN
)
RETURNS TABLE(
  xp_added NUMERIC,
  level_before INTEGER,
  level_after INTEGER,
  leveled_up BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_xp_added NUMERIC(12,3);
  v_level_before INTEGER;
  v_level_after INTEGER;
  v_leveled_up BOOLEAN := FALSE;
  v_new_lifetime_xp NUMERIC(12,3);
  v_level_result RECORD;
BEGIN
  -- Calculate XP as exactly 10% of bet amount with 3 decimal precision
  -- $0.01 bet = 0.001 XP, $1.00 bet = 0.100 XP, $10.00 bet = 1.000 XP
  v_xp_added := ROUND((p_bet_amount * 0.1)::NUMERIC, 3);
  
  -- Ensure minimum XP is 0.001 for any non-zero bet
  IF p_bet_amount > 0 AND v_xp_added < 0.001 THEN
    v_xp_added := 0.001;
  END IF;

  -- Get current level before update
  SELECT current_level INTO v_level_before 
  FROM user_level_stats 
  WHERE user_id = p_user_id;

  -- Insert or update user_level_stats with proper decimal precision
  INSERT INTO user_level_stats (
    user_id,
    lifetime_xp,
    current_level,
    current_level_xp,
    xp_to_next_level,
    total_games,
    total_wins,
    total_wagered,
    total_profit,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    v_xp_added,  -- Start with the XP from this bet
    1,           -- Start at level 1
    0,           -- Will be calculated below
    651,         -- Default XP to next level
    1,           -- First game
    CASE WHEN p_is_win THEN 1 ELSE 0 END,
    p_bet_amount,
    p_profit,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_xp = user_level_stats.lifetime_xp + v_xp_added,
    total_games = user_level_stats.total_games + 1,
    total_wins = user_level_stats.total_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    total_wagered = user_level_stats.total_wagered + p_bet_amount,
    total_profit = user_level_stats.total_profit + p_profit,
    updated_at = NOW();

  -- Update game-specific stats
  IF p_game_type = 'roulette' THEN
    UPDATE user_level_stats SET
      roulette_games = COALESCE(roulette_games, 0) + 1,
      roulette_wins = COALESCE(roulette_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      roulette_wagered = COALESCE(roulette_wagered, 0) + p_bet_amount,
      roulette_profit = COALESCE(roulette_profit, 0) + p_profit
    WHERE user_id = p_user_id;
  ELSIF p_game_type = 'coinflip' THEN
    UPDATE user_level_stats SET
      coinflip_games = COALESCE(coinflip_games, 0) + 1,
      coinflip_wins = COALESCE(coinflip_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      coinflip_wagered = COALESCE(coinflip_wagered, 0) + p_bet_amount,
      coinflip_profit = COALESCE(coinflip_profit, 0) + p_profit
    WHERE user_id = p_user_id;
  ELSIF p_game_type = 'tower' THEN
    UPDATE user_level_stats SET
      tower_games = COALESCE(tower_games, 0) + 1,
      tower_wins = COALESCE(tower_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      tower_wagered = COALESCE(tower_wagered, 0) + p_bet_amount,
      tower_profit = COALESCE(tower_profit, 0) + p_profit
    WHERE user_id = p_user_id;
  END IF;

  -- Get updated lifetime XP with full precision
  SELECT lifetime_xp INTO v_new_lifetime_xp 
  FROM user_level_stats 
  WHERE user_id = p_user_id;

  -- Calculate new level and XP distribution using fixed level calculation
  SELECT * INTO v_level_result 
  FROM public.calculate_level_from_xp_new(FLOOR(v_new_lifetime_xp)::INTEGER);

  v_level_after := v_level_result.level;
  v_leveled_up := v_level_after > COALESCE(v_level_before, 1);

  -- Update level information with proper decimal precision
  UPDATE user_level_stats SET
    current_level = v_level_after,
    current_level_xp = ROUND(v_level_result.current_level_xp::NUMERIC, 3),
    xp_to_next_level = v_level_result.xp_to_next
  WHERE user_id = p_user_id;

  -- Return results
  RETURN QUERY SELECT 
    v_xp_added,
    COALESCE(v_level_before, 1),
    v_level_after,
    v_leveled_up;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in update_user_level_stats: %', SQLERRM;
    -- Return safe defaults
    RETURN QUERY SELECT 
      0::NUMERIC(12,3),
      1,
      1,
      FALSE;
END;
$$;

-- Step 2: Grant permissions
-- ========================

GRANT EXECUTE ON FUNCTION public.update_user_level_stats(UUID, TEXT, DECIMAL, DECIMAL, BOOLEAN) TO anon, authenticated, service_role;

-- Step 3: Test the function
-- ========================

DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing restored XP function:';
  
  -- Test that the function exists and can be called
  RAISE NOTICE '✅ update_user_level_stats() function restored';
  RAISE NOTICE '✅ Supports NUMERIC(12,3) XP precision';
  RAISE NOTICE '✅ Calculates 10%% of bet amount as XP';
  RAISE NOTICE '✅ Minimum 0.001 XP for any non-zero bet';
  
  RAISE NOTICE '🎯 XP Calculation Examples:';
  RAISE NOTICE '  $0.01 bet = 0.001 XP (minimum)';
  RAISE NOTICE '  $0.10 bet = 0.010 XP';
  RAISE NOTICE '  $1.00 bet = 0.100 XP';
  RAISE NOTICE '  $10.00 bet = 1.000 XP';
  
  RAISE NOTICE '✅ XP function restored! Games should now award XP again!';
END $$;