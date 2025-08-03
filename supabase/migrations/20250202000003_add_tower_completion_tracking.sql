-- Add columns to track tower completions by difficulty
-- These columns will count how many times a user has completed each difficulty

-- Add new columns to user_level_stats table
ALTER TABLE public.user_level_stats 
ADD COLUMN IF NOT EXISTS tower_easy_completions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tower_medium_completions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tower_hard_completions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tower_extreme_completions INTEGER DEFAULT 0;

-- Update the update_user_level_stats function to track completions
CREATE OR REPLACE FUNCTION public.update_user_level_stats(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount DECIMAL,
  p_profit DECIMAL,
  p_is_win BOOLEAN,
  p_difficulty TEXT DEFAULT NULL,
  p_completed BOOLEAN DEFAULT FALSE
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
  v_current_coinflip_streak INTEGER;
  v_best_coinflip_streak INTEGER;
BEGIN
  -- Calculate XP (10% of bet amount, minimum 0.001)
  v_xp_added := GREATEST(p_bet_amount * 0.10, 0.001);
  
  -- Get current level before update
  SELECT COALESCE(user_level, 1) INTO v_level_before 
  FROM user_level_stats WHERE user_id = p_user_id;
  
  IF v_level_before IS NULL THEN
    v_level_before := 1;
  END IF;
  
  -- Insert or update user_level_stats
  INSERT INTO user_level_stats (
    user_id, lifetime_xp, total_games, total_wins, total_wagered, total_profit, user_level, created_at, updated_at
  ) VALUES (
    p_user_id, v_xp_added, 1, CASE WHEN p_is_win THEN 1 ELSE 0 END, p_bet_amount, p_profit, 1, NOW(), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    lifetime_xp = user_level_stats.lifetime_xp + v_xp_added,
    total_games = user_level_stats.total_games + 1,
    total_wins = user_level_stats.total_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
    total_wagered = user_level_stats.total_wagered + p_bet_amount,
    total_profit = user_level_stats.total_profit + p_profit,
    -- Add missing advanced stat tracking
    biggest_win = GREATEST(user_level_stats.biggest_win, CASE WHEN p_profit > 0 THEN p_profit ELSE user_level_stats.biggest_win END),
    biggest_loss = LEAST(user_level_stats.biggest_loss, CASE WHEN p_profit < 0 THEN p_profit ELSE user_level_stats.biggest_loss END),
    biggest_single_bet = GREATEST(user_level_stats.biggest_single_bet, p_bet_amount),
    updated_at = NOW();

  -- Update game-specific stats with enhanced tracking
  IF p_game_type = 'roulette' THEN
    UPDATE user_level_stats SET
      roulette_games = COALESCE(roulette_games, 0) + 1,
      roulette_wins = COALESCE(roulette_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      roulette_wagered = COALESCE(roulette_wagered, 0) + p_bet_amount,
      roulette_profit = COALESCE(roulette_profit, 0) + p_profit,
      -- Add missing roulette-specific stat tracking
      roulette_highest_win = GREATEST(COALESCE(roulette_highest_win, 0), CASE WHEN p_profit > 0 THEN p_profit ELSE COALESCE(roulette_highest_win, 0) END),
      roulette_biggest_bet = GREATEST(COALESCE(roulette_biggest_bet, 0), p_bet_amount)
    WHERE user_id = p_user_id;

  ELSIF p_game_type = 'coinflip' THEN
    -- Get current coinflip streak values for streak tracking
    SELECT COALESCE(current_coinflip_streak, 0), COALESCE(best_coinflip_streak, 0)
    INTO v_current_coinflip_streak, v_best_coinflip_streak
    FROM user_level_stats WHERE user_id = p_user_id;

    -- Update coinflip streak based on win/loss
    IF p_is_win THEN
      v_current_coinflip_streak := v_current_coinflip_streak + 1;
      v_best_coinflip_streak := GREATEST(v_best_coinflip_streak, v_current_coinflip_streak);
    ELSE
      v_current_coinflip_streak := 0;
    END IF;

    UPDATE user_level_stats SET
      coinflip_games = COALESCE(coinflip_games, 0) + 1,
      coinflip_wins = COALESCE(coinflip_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      coinflip_wagered = COALESCE(coinflip_wagered, 0) + p_bet_amount,
      coinflip_profit = COALESCE(coinflip_profit, 0) + p_profit,
      -- Add missing coinflip streak tracking
      current_coinflip_streak = v_current_coinflip_streak,
      best_coinflip_streak = v_best_coinflip_streak
    WHERE user_id = p_user_id;

  ELSIF p_game_type = 'tower' THEN
    UPDATE user_level_stats SET
      tower_games = COALESCE(tower_games, 0) + 1,
      tower_wins = COALESCE(tower_wins, 0) + CASE WHEN p_is_win THEN 1 ELSE 0 END,
      tower_wagered = COALESCE(tower_wagered, 0) + p_bet_amount,
      tower_profit = COALESCE(tower_profit, 0) + p_profit,
      -- Track tower completions by difficulty
      tower_easy_completions = COALESCE(tower_easy_completions, 0) + CASE WHEN p_completed AND p_difficulty = 'easy' THEN 1 ELSE 0 END,
      tower_medium_completions = COALESCE(tower_medium_completions, 0) + CASE WHEN p_completed AND p_difficulty = 'medium' THEN 1 ELSE 0 END,
      tower_hard_completions = COALESCE(tower_hard_completions, 0) + CASE WHEN p_completed AND p_difficulty = 'hard' THEN 1 ELSE 0 END,
      tower_extreme_completions = COALESCE(tower_extreme_completions, 0) + CASE WHEN p_completed AND p_difficulty = 'extreme' THEN 1 ELSE 0 END
    WHERE user_id = p_user_id;
  END IF;

  -- Get updated lifetime XP for level calculation
  SELECT lifetime_xp INTO v_new_lifetime_xp FROM user_level_stats WHERE user_id = p_user_id;
  
  -- Calculate new level using the fixed level calculation function
  SELECT * INTO v_level_result FROM calculate_level_from_xp_new(v_new_lifetime_xp);
  v_level_after := v_level_result.level;
  
  -- Check if user leveled up
  v_leveled_up := v_level_after > v_level_before;
  
  -- Update the user level in the table
  UPDATE user_level_stats SET user_level = v_level_after WHERE user_id = p_user_id;
  
  -- Also update the profiles table user_level for consistency
  UPDATE profiles SET user_level = v_level_after WHERE id = p_user_id;
  
  -- Return the results
  RETURN QUERY SELECT v_xp_added, v_level_before, v_level_after, v_leveled_up;
END;
$$;