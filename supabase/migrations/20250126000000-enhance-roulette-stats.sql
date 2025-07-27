-- Enhanced Roulette Statistics Migration
-- Adds detailed tracking for roulette-specific statistics

-- Add roulette-specific statistics columns
ALTER TABLE public.user_level_stats 
ADD COLUMN IF NOT EXISTS roulette_highest_win NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS roulette_highest_loss NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS roulette_green_wins INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS roulette_red_wins INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS roulette_black_wins INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS roulette_favorite_color TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS roulette_best_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS roulette_current_streak INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS roulette_biggest_bet NUMERIC NOT NULL DEFAULT 0;

-- Update existing roulette statistics function to include new tracking
CREATE OR REPLACE FUNCTION public.update_user_stats_and_level(
  p_user_id UUID,
  p_game_type TEXT,
  p_bet_amount NUMERIC,
  p_result TEXT,
  p_profit NUMERIC,
  p_streak_length INTEGER DEFAULT 0,
  p_winning_color TEXT DEFAULT NULL,
  p_bet_color TEXT DEFAULT NULL
)
RETURNS TABLE(leveled_up boolean, new_level integer, old_level integer, cases_earned integer, border_tier_changed boolean, new_border_tier integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  current_stats RECORD;
  new_xp INTEGER;
  level_calc RECORD;
  old_level_val INTEGER;
  new_level_val INTEGER;
  old_border_tier INTEGER;
  new_border_tier_val INTEGER;
  cases_to_add INTEGER := 0;
  did_level_up BOOLEAN := false;
  border_changed BOOLEAN := false;
  i INTEGER;
  is_win BOOLEAN;
  new_roulette_streak INTEGER := 0;
  is_roulette_win BOOLEAN := false;
BEGIN
  -- Determine if this is a win
  is_win := (p_result = 'win' OR p_result = 'cash_out') AND p_profit > 0;
  is_roulette_win := p_game_type = 'roulette' AND is_win;
  
  -- Get current stats
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = p_user_id;
  
  -- If no stats exist, create them
  IF current_stats IS NULL THEN
    INSERT INTO public.user_level_stats (user_id) VALUES (p_user_id);
    SELECT * INTO current_stats FROM public.user_level_stats WHERE user_id = p_user_id;
  END IF;
  
  old_level_val := current_stats.current_level;
  old_border_tier := current_stats.border_tier;
  
  -- Calculate new XP (1 XP per $1 wagered)
  new_xp := current_stats.lifetime_xp + p_bet_amount::INTEGER;
  
  -- Calculate new level
  SELECT * INTO level_calc FROM public.calculate_level_from_xp_new(new_xp);
  new_level_val := level_calc.level;
  
  -- Check if leveled up and calculate cases
  IF new_level_val > old_level_val THEN
    did_level_up := true;
    
    -- Calculate cases earned (every 25 levels)
    FOR i IN (old_level_val + 1)..new_level_val LOOP
      IF i % 25 = 0 THEN
        cases_to_add := cases_to_add + 1;
        
        -- Create case reward entry
        INSERT INTO public.case_rewards (user_id, level_unlocked, rarity, reward_amount)
        VALUES (p_user_id, i, 'pending', 0);
      END IF;
    END LOOP;
  END IF;
  
  -- Calculate new border tier
  SELECT tier INTO new_border_tier_val
  FROM public.border_tiers
  WHERE new_level_val >= min_level AND new_level_val <= max_level;
  
  IF new_border_tier_val IS NULL THEN
    new_border_tier_val := old_border_tier;
  END IF;
  
  border_changed := new_border_tier_val != old_border_tier;
  
  -- Calculate roulette streak
  IF p_game_type = 'roulette' THEN
    IF is_roulette_win THEN
      new_roulette_streak := current_stats.roulette_current_streak + 1;
    ELSE
      new_roulette_streak := 0;
    END IF;
  ELSE
    new_roulette_streak := current_stats.roulette_current_streak;
  END IF;
  
  -- Update comprehensive stats
  UPDATE public.user_level_stats 
  SET 
    -- Level data
    current_level = new_level_val,
    lifetime_xp = new_xp,
    current_level_xp = level_calc.current_level_xp,
    xp_to_next_level = level_calc.xp_to_next,
    
    -- Border data
    border_tier = new_border_tier_val,
    border_unlocked_at = CASE 
      WHEN border_changed THEN now() 
      ELSE border_unlocked_at 
    END,
    
    -- Case data
    available_cases = available_cases + cases_to_add,
    
    -- Game-specific stats
    coinflip_games = CASE WHEN p_game_type = 'coinflip' THEN coinflip_games + 1 ELSE coinflip_games END,
    coinflip_wins = CASE WHEN p_game_type = 'coinflip' AND is_win THEN coinflip_wins + 1 ELSE coinflip_wins END,
    coinflip_wagered = CASE WHEN p_game_type = 'coinflip' THEN coinflip_wagered + p_bet_amount ELSE coinflip_wagered END,
    coinflip_profit = CASE WHEN p_game_type = 'coinflip' THEN coinflip_profit + p_profit ELSE coinflip_profit END,
    
    crash_games = CASE WHEN p_game_type = 'crash' THEN crash_games + 1 ELSE crash_games END,
    crash_wins = CASE WHEN p_game_type = 'crash' AND is_win THEN crash_wins + 1 ELSE crash_wins END,
    crash_wagered = CASE WHEN p_game_type = 'crash' THEN crash_wagered + p_bet_amount ELSE crash_wagered END,
    crash_profit = CASE WHEN p_game_type = 'crash' THEN crash_profit + p_profit ELSE crash_profit END,
    
    roulette_games = CASE WHEN p_game_type = 'roulette' THEN roulette_games + 1 ELSE roulette_games END,
    roulette_wins = CASE WHEN p_game_type = 'roulette' AND is_win THEN roulette_wins + 1 ELSE roulette_wins END,
    roulette_wagered = CASE WHEN p_game_type = 'roulette' THEN roulette_wagered + p_bet_amount ELSE roulette_wagered END,
    roulette_profit = CASE WHEN p_game_type = 'roulette' THEN roulette_profit + p_profit ELSE roulette_profit END,
    
    -- Enhanced roulette stats
    roulette_highest_win = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_profit > roulette_highest_win 
      THEN p_profit 
      ELSE roulette_highest_win 
    END,
    roulette_highest_loss = CASE 
      WHEN p_game_type = 'roulette' AND NOT is_win AND ABS(p_profit) > roulette_highest_loss 
      THEN ABS(p_profit) 
      ELSE roulette_highest_loss 
    END,
    roulette_green_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'green' 
      THEN roulette_green_wins + 1 
      ELSE roulette_green_wins 
    END,
    roulette_red_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'red' 
      THEN roulette_red_wins + 1 
      ELSE roulette_red_wins 
    END,
    roulette_black_wins = CASE 
      WHEN p_game_type = 'roulette' AND is_win AND p_winning_color = 'black' 
      THEN roulette_black_wins + 1 
      ELSE roulette_black_wins 
    END,
    roulette_biggest_bet = CASE 
      WHEN p_game_type = 'roulette' AND p_bet_amount > roulette_biggest_bet 
      THEN p_bet_amount 
      ELSE roulette_biggest_bet 
    END,
    roulette_current_streak = new_roulette_streak,
    roulette_best_streak = CASE 
      WHEN p_game_type = 'roulette' AND new_roulette_streak > roulette_best_streak 
      THEN new_roulette_streak 
      ELSE roulette_best_streak 
    END,
    
    tower_games = CASE WHEN p_game_type = 'tower' THEN tower_games + 1 ELSE tower_games END,
    tower_wins = CASE WHEN p_game_type = 'tower' AND is_win THEN tower_wins + 1 ELSE tower_wins END,
    tower_wagered = CASE WHEN p_game_type = 'tower' THEN tower_wagered + p_bet_amount ELSE tower_wagered END,
    tower_profit = CASE WHEN p_game_type = 'tower' THEN tower_profit + p_profit ELSE tower_profit END,
    
    -- Overall stats
    total_games = total_games + 1,
    total_wins = CASE WHEN is_win THEN total_wins + 1 ELSE total_wins END,
    total_wagered = total_wagered + p_bet_amount,
    total_profit = total_profit + p_profit,
    
    -- Streak tracking for coinflip
    current_coinflip_streak = CASE 
      WHEN p_game_type = 'coinflip' AND is_win THEN current_coinflip_streak + 1
      WHEN p_game_type = 'coinflip' AND NOT is_win THEN 0
      ELSE current_coinflip_streak
    END,
    best_coinflip_streak = CASE 
      WHEN p_game_type = 'coinflip' AND is_win AND (current_coinflip_streak + 1) > best_coinflip_streak 
      THEN current_coinflip_streak + 1
      ELSE best_coinflip_streak
    END,
    
    -- Win/loss tracking
    biggest_win = CASE WHEN is_win AND p_profit > biggest_win THEN p_profit ELSE biggest_win END,
    biggest_loss = CASE WHEN NOT is_win AND ABS(p_profit) > biggest_loss THEN ABS(p_profit) ELSE biggest_loss END,
    
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Calculate favorite color based on win counts
  IF p_game_type = 'roulette' THEN
    UPDATE public.user_level_stats 
    SET roulette_favorite_color = CASE
      WHEN roulette_green_wins >= roulette_red_wins AND roulette_green_wins >= roulette_black_wins THEN 'green'
      WHEN roulette_red_wins >= roulette_black_wins THEN 'red'
      ELSE 'black'
    END
    WHERE user_id = p_user_id AND (roulette_green_wins > 0 OR roulette_red_wins > 0 OR roulette_black_wins > 0);
  END IF;

  -- Return results
  RETURN QUERY SELECT 
    did_level_up,
    new_level_val,
    old_level_val,
    cases_to_add,
    border_changed,
    new_border_tier_val;
    
END;
$function$;