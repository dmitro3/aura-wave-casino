-- Fix Level-Based Achievements System
-- Remove old level achievements and create complete progression set
-- ===================================================================

-- Remove existing level achievements to prevent conflicts
DELETE FROM public.user_achievements 
WHERE achievement_id IN ('level_master', 'level_legend');

DELETE FROM public.achievements 
WHERE id IN ('level_master', 'level_legend');

-- Insert complete level progression achievements
INSERT INTO public.achievements (id, name, description, category, icon, rarity, difficulty, reward_amount, reward_type, unlock_criteria) VALUES
('novice_level', 'Novice', 'Reach level 5', 'progression', 'Star', 'common', 'easy', 50, 'money', '{"type": "user_level", "value": 5}'),
('experienced_level', 'Experienced', 'Reach level 10', 'progression', 'Award', 'common', 'easy', 100, 'money', '{"type": "user_level", "value": 10}'),
('veteran_level', 'Veteran', 'Reach level 25', 'progression', 'Shield', 'rare', 'medium', 250, 'money', '{"type": "user_level", "value": 25}'),
('expert_level', 'Expert', 'Reach level 50', 'progression', 'Crown', 'epic', 'hard', 500, 'money', '{"type": "user_level", "value": 50}'),
('master_level', 'Master', 'Reach level 100', 'progression', 'Trophy', 'legendary', 'extreme', 1000, 'money', '{"type": "user_level", "value": 100}');

-- Update the achievement checking function to properly handle user_level criteria
-- This ensures the backend function matches the frontend logic
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(
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
  user_profile RECORD;
  criteria JSON;
  newly_unlocked_achievements JSON[] := '{}';
  achievement_json JSON;
BEGIN
  -- Get user stats and profile
  SELECT * INTO user_stats FROM public.user_level_stats WHERE user_id = p_user_id;
  SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
  
  IF user_stats IS NULL OR user_profile IS NULL THEN
    RETURN '{"error": "User not found"}'::JSON;
  END IF;

  -- Check all achievements
  FOR achievement IN 
    SELECT a.* FROM public.achievements a 
    WHERE a.id NOT IN (
      SELECT ua.achievement_id FROM public.user_achievements ua 
      WHERE ua.user_id = p_user_id
    )
  LOOP
    criteria := achievement.unlock_criteria;
    
    -- Check if criteria is met based on type
    IF (criteria->>'type' = 'total_games' AND user_stats.total_games >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'total_wins' AND user_stats.total_wins >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'total_profit' AND user_stats.total_profit >= (criteria->>'value')::NUMERIC) OR
       (criteria->>'type' = 'total_wagered' AND user_stats.total_wagered >= (criteria->>'value')::NUMERIC) OR
       (criteria->>'type' = 'roulette_games' AND user_stats.roulette_games >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'roulette_wins' AND user_stats.roulette_wins >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'roulette_green_wins' AND user_stats.roulette_green_wins >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'roulette_biggest_win' AND user_stats.roulette_highest_win >= (criteria->>'value')::NUMERIC) OR
       (criteria->>'type' = 'tower_games' AND user_stats.tower_games >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'tower_highest_level' AND user_stats.tower_highest_level >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'tower_perfect_games' AND user_stats.tower_perfect_games >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'coinflip_wins' AND user_stats.coinflip_wins >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'total_cases_opened' AND user_stats.total_cases_opened >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'account_created' AND user_stats.account_created IS NOT NULL) OR
       (criteria->>'type' = 'chat_messages' AND user_stats.chat_messages_count >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'login_days' AND user_stats.login_days_count >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'win_streak' AND user_stats.best_win_streak >= (criteria->>'value')::INTEGER) OR
       (criteria->>'type' = 'biggest_single_bet' AND user_stats.biggest_single_bet >= (criteria->>'value')::NUMERIC) OR
       -- FIXED: User level achievement support
       (criteria->>'type' = 'user_level' AND user_stats.current_level >= (criteria->>'value')::INTEGER)
    THEN
      -- Award the achievement
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
      VALUES (p_user_id, achievement.id, NOW());
      
      -- Award the reward
      PERFORM public.award_achievement_reward(
        p_user_id, 
        achievement.id, 
        achievement.reward_amount, 
        achievement.reward_type
      );
      
      -- Add to newly unlocked list
      achievement_json := json_build_object(
        'id', achievement.id,
        'name', achievement.name,
        'description', achievement.description,
        'rarity', achievement.rarity,
        'reward_amount', achievement.reward_amount,
        'reward_type', achievement.reward_type
      );
      
      newly_unlocked_achievements := newly_unlocked_achievements || achievement_json;
    END IF;
  END LOOP;

  RETURN json_build_object('newly_unlocked', newly_unlocked_achievements);
END;
$$;

-- Check all current users for new level achievements
-- This will award achievements retroactively for users who already meet the criteria
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT id FROM public.profiles WHERE current_level >= 5
    LOOP
        PERFORM public.check_and_award_achievements(user_record.id);
    END LOOP;
END $$;

RAISE NOTICE '✅ Level-based achievements system fixed!';
RAISE NOTICE '🎯 New achievements: Novice (5), Experienced (10), Veteran (25), Expert (50), Master (100)';
RAISE NOTICE '📊 User level achievement tracking now works properly';
RAISE NOTICE '🔄 Retroactively checked all existing users for level achievements';