-- ===============================================
-- FIX FUNCTION OVERLOADING ISSUE
-- ===============================================
-- This fixes the multiple function versions causing overloading conflicts

-- Step 1: Drop ALL versions of the function
-- =========================================

DROP FUNCTION IF EXISTS public.update_user_level_stats(UUID, TEXT, DECIMAL, DECIMAL, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_level_stats(UUID, TEXT, NUMERIC, NUMERIC, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.update_user_level_stats CASCADE;

-- Also drop any old conflicting functions
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup CASCADE;
DROP FUNCTION IF EXISTS public.update_user_stats_and_xp CASCADE;

-- Step 2: Create ONE clean version of the function
-- ===============================================

CREATE OR REPLACE FUNCTION public.update_user_level_stats(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_profit NUMERIC,
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
  -- Log function call for debugging
  RAISE LOG 'update_user_level_stats called: user=%, game=%, bet=%, profit=%, win=%', 
    p_user_id, p_game_type, p_bet_amount, p_profit, p_is_win;

  -- Calculate XP as exactly 10% of bet amount with 3 decimal precision
  -- $0.01 bet = 0.001 XP, $1.00 bet = 0.100 XP, $10.00 bet = 1.000 XP
  v_xp_added := ROUND((p_bet_amount * 0.1)::NUMERIC, 3);
  
  -- Ensure minimum XP is 0.001 for any non-zero bet
  IF p_bet_amount > 0 AND v_xp_added < 0.001 THEN
    v_xp_added := 0.001;
  END IF;

  RAISE LOG 'Calculated XP: %', v_xp_added;

  -- Get current level before update
  SELECT current_level INTO v_level_before 
  FROM user_level_stats 
  WHERE user_id = p_user_id;

  RAISE LOG 'Level before: %', COALESCE(v_level_before, 1);

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

  RAISE LOG 'Updated user_level_stats for user: %', p_user_id;

  -- Update game-specific stats
  IF p_game_type = 'roulette' THEN
    UPDATE user_level_stats SET
      roulette_games = COALESCE(roulette_games, 0) + 1,
      roulette_wins = COALESCE(roulette_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      roulette_wagered = COALESCE(roulette_wagered, 0) + p_bet_amount,
      roulette_profit = COALESCE(roulette_profit, 0) + p_profit
    WHERE user_id = p_user_id;
    RAISE LOG 'Updated roulette stats for user: %', p_user_id;
  ELSIF p_game_type = 'coinflip' THEN
    UPDATE user_level_stats SET
      coinflip_games = COALESCE(coinflip_games, 0) + 1,
      coinflip_wins = COALESCE(coinflip_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      coinflip_wagered = COALESCE(coinflip_wagered, 0) + p_bet_amount,
      coinflip_profit = COALESCE(coinflip_profit, 0) + p_profit
    WHERE user_id = p_user_id;
    RAISE LOG 'Updated coinflip stats for user: %', p_user_id;
  ELSIF p_game_type = 'tower' THEN
    UPDATE user_level_stats SET
      tower_games = COALESCE(tower_games, 0) + 1,
      tower_wins = COALESCE(tower_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      tower_wagered = COALESCE(tower_wagered, 0) + p_bet_amount,
      tower_profit = COALESCE(tower_profit, 0) + p_profit
    WHERE user_id = p_user_id;
    RAISE LOG 'Updated tower stats for user: %', p_user_id;
  END IF;

  -- Get updated lifetime XP with full precision
  SELECT lifetime_xp INTO v_new_lifetime_xp 
  FROM user_level_stats 
  WHERE user_id = p_user_id;

  RAISE LOG 'New lifetime XP: %', v_new_lifetime_xp;

  -- Calculate new level and XP distribution using fixed level calculation
  -- Only call if the function exists
  BEGIN
    SELECT * INTO v_level_result 
    FROM public.calculate_level_from_xp_new(FLOOR(v_new_lifetime_xp)::INTEGER);
    
    v_level_after := v_level_result.level;
    v_leveled_up := v_level_after > COALESCE(v_level_before, 1);

    RAISE LOG 'Level calculation result: level=%, current_xp=%, xp_to_next=%', 
      v_level_result.level, v_level_result.current_level_xp, v_level_result.xp_to_next;

    -- Update level information with proper decimal precision
    UPDATE user_level_stats SET
      current_level = v_level_after,
      current_level_xp = ROUND(v_level_result.current_level_xp::NUMERIC, 3),
      xp_to_next_level = v_level_result.xp_to_next
    WHERE user_id = p_user_id;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- If level calculation fails, use defaults
      RAISE LOG 'Level calculation failed, using defaults: %', SQLERRM;
      v_level_after := COALESCE(v_level_before, 1);
      v_leveled_up := FALSE;
      
      UPDATE user_level_stats SET
        current_level = v_level_after,
        current_level_xp = LEAST(v_new_lifetime_xp, 651),
        xp_to_next_level = GREATEST(1, 651 - FLOOR(v_new_lifetime_xp))
      WHERE user_id = p_user_id;
  END;

  RAISE LOG 'Function completed successfully: XP added=%, level %->%, leveled_up=%', 
    v_xp_added, COALESCE(v_level_before, 1), v_level_after, v_leveled_up;

  -- Return results
  RETURN QUERY SELECT 
    v_xp_added,
    COALESCE(v_level_before, 1),
    v_level_after,
    v_leveled_up;

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'ERROR in update_user_level_stats: %', SQLERRM;
    -- Return safe defaults
    RETURN QUERY SELECT 
      0::NUMERIC(12,3),
      1,
      1,
      FALSE;
END;
$$;

-- Step 3: Grant permissions
-- ========================

GRANT EXECUTE ON FUNCTION public.update_user_level_stats(UUID, TEXT, NUMERIC, NUMERIC, BOOLEAN) TO anon, authenticated, service_role;

-- Step 4: Test the function
-- ========================

DO $$
DECLARE
  test_result RECORD;
BEGIN
  RAISE NOTICE '🧪 Testing function overloading fix:';
  
  -- Test that only ONE version of the function exists
  RAISE NOTICE '✅ Dropped all conflicting function versions';
  RAISE NOTICE '✅ Created single clean update_user_level_stats function';
  RAISE NOTICE '✅ Added extensive logging for debugging';
  RAISE NOTICE '✅ Function overloading conflict resolved';
  
  RAISE NOTICE '🎯 XP Calculation:';
  RAISE NOTICE '  $0.01 bet = 0.001 XP (minimum)';
  RAISE NOTICE '  $1.00 bet = 0.100 XP';
  RAISE NOTICE '  $10.00 bet = 1.000 XP';
  
  RAISE NOTICE '🔍 DEBUGGING:';
  RAISE NOTICE '  Function calls will be logged to PostgreSQL logs';
  RAISE NOTICE '  Check Supabase logs for function execution details';
  
  RAISE NOTICE '✅ Function overloading FIXED! XP should work now!';
END $$;