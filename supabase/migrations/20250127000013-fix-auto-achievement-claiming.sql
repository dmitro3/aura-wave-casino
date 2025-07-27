-- Fix auto-achievement claiming issue
-- The current trigger automatically awards achievements when stats are updated
-- We need to modify it to only check for ready-to-claim achievements without auto-awarding

-- Drop the current trigger
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.user_level_stats;

-- Create a new function that only checks for ready achievements without auto-awarding
CREATE OR REPLACE FUNCTION public.check_ready_achievements(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  achievement RECORD;
  user_stats RECORD;
  ready_achievements JSON[] := '{}';
  achievement_json JSON;
BEGIN
  -- Get user stats
  SELECT * INTO user_stats FROM public.user_level_stats WHERE user_id = p_user_id;
  
  IF user_stats IS NULL THEN
    RETURN '{"error": "User not found"}'::JSON;
  END IF;

  -- Check all achievements for ready-to-claim status (but don't award them)
  FOR achievement IN 
    SELECT a.* FROM public.achievements a 
    WHERE a.id NOT IN (
      SELECT ua.achievement_id FROM public.user_achievements ua 
      WHERE ua.user_id = p_user_id
    )
  LOOP
    -- Check if criteria is met based on type (same logic as before)
    IF (achievement.criteria->>'type' = 'total_games' AND user_stats.total_games >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'total_wins' AND user_stats.total_wins >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'total_profit' AND user_stats.total_profit >= (achievement.criteria->>'value')::NUMERIC) OR
       (achievement.criteria->>'type' = 'total_wagered' AND user_stats.total_wagered >= (achievement.criteria->>'value')::NUMERIC) OR
       (achievement.criteria->>'type' = 'roulette_games' AND user_stats.roulette_games >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'roulette_wins' AND user_stats.roulette_wins >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'roulette_green_wins' AND user_stats.roulette_green_wins >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'roulette_biggest_win' AND user_stats.roulette_highest_win >= (achievement.criteria->>'value')::NUMERIC) OR
       (achievement.criteria->>'type' = 'tower_games' AND user_stats.tower_games >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'tower_highest_level' AND user_stats.tower_highest_level >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'tower_perfect_games' AND user_stats.tower_perfect_games >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'coinflip_wins' AND user_stats.coinflip_wins >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'total_cases_opened' AND user_stats.total_cases_opened >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'account_created' AND user_stats.account_created IS NOT NULL) OR
       (achievement.criteria->>'type' = 'chat_messages' AND user_stats.chat_messages_count >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'login_days' AND user_stats.login_days_count >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'win_streak' AND user_stats.best_win_streak >= (achievement.criteria->>'value')::INTEGER) OR
       (achievement.criteria->>'type' = 'biggest_single_bet' AND user_stats.biggest_single_bet >= (achievement.criteria->>'value')::NUMERIC) OR
       (achievement.criteria->>'type' = 'user_level' AND user_stats.current_level >= (achievement.criteria->>'value')::INTEGER)
    THEN
      -- Add to ready achievements list (but don't award it)
      achievement_json := json_build_object(
        'id', achievement.id,
        'name', achievement.name,
        'description', achievement.description,
        'rarity', achievement.rarity,
        'reward_amount', achievement.reward_amount,
        'reward_type', achievement.reward_type,
        'criteria', achievement.criteria
      );
      
      ready_achievements := ready_achievements || achievement_json;
    END IF;
  END LOOP;

  RETURN json_build_object('ready_achievements', ready_achievements);
END;
$$;

-- Create a new trigger function that only logs ready achievements (doesn't award them)
CREATE OR REPLACE FUNCTION public.trigger_check_ready_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Only check for ready achievements, don't award them automatically
  -- This prevents auto-claiming while still tracking progress
  PERFORM public.check_ready_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Create the new trigger (this will NOT auto-award achievements)
CREATE TRIGGER check_ready_achievements_trigger
  AFTER UPDATE ON public.user_level_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_ready_achievements();