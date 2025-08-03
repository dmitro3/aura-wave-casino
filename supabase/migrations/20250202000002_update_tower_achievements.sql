-- Update Tower Achievements: Replace level-based with difficulty-specific completion achievements
-- This migration removes old tower achievements and adds new ones based on completing each difficulty

-- Remove old tower achievements that are level-based
DELETE FROM public.achievements WHERE id IN (
  SELECT id FROM public.achievements 
  WHERE name IN ('Tower Climber', 'Tower Master', 'Tower Daredevil', 'Tower God')
  AND (
    criteria->>'type' = 'tower_highest_level' OR 
    (criteria->>'type' = 'tower_games' AND name = 'Tower Climber')
  )
);

-- Add new difficulty-specific tower completion achievements
INSERT INTO public.achievements (
  id, name, description, category, icon, rarity, difficulty, reward_amount, reward_type, criteria
) VALUES 
-- Tower Climber: Complete Neural Rookie (Easy) - Level 9
(
  'tower_climber_neural',
  'Tower Climber', 
  'Reach the top as a Neural Rookie',
  'tower',
  'Building',
  'common',
  'easy',
  250,
  'money',
  '{"type": "tower_completion", "difficulty": "easy", "max_level": 9}'
),

-- Sky Scraper: Complete Cyber Operator (Medium) - Level 9  
(
  'tower_skyscraper_cyber',
  'Sky Scraper',
  'Reach the top as a Cyber Operator', 
  'tower',
  'Crown',
  'rare', 
  'medium',
  750,
  'money',
  '{"type": "tower_completion", "difficulty": "medium", "max_level": 9}'
),

-- Tower Master: Complete Elite Hacker (Hard) - Level 9
(
  'tower_master_elite',
  'Tower Master',
  'Reach the top as an Elite Hacker',
  'tower', 
  'Zap',
  'epic',
  'hard', 
  2000,
  'money',
  '{"type": "tower_completion", "difficulty": "hard", "max_level": 9}'
),

-- Tower Legend: Complete Matrix Legend (Extreme) - Level 6
(
  'tower_legend_matrix',
  'Tower Legend',
  'Reach the top as a Matrix Legend',
  'tower',
  'Trophy', 
  'legendary',
  'extreme',
  5000,
  'money',
  '{"type": "tower_completion", "difficulty": "extreme", "max_level": 6}'
);

-- Update the achievement checking function to handle tower completion achievements
CREATE OR REPLACE FUNCTION public.check_ready_achievements(user_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_stats RECORD;
  achievement RECORD;
BEGIN
  -- Get user stats
  SELECT * INTO user_stats 
  FROM public.user_level_stats 
  WHERE user_id = user_id_param;
  
  IF user_stats IS NULL THEN
    RETURN;
  END IF;

  -- Check each achievement
  FOR achievement IN 
    SELECT * FROM public.achievements 
    WHERE NOT EXISTS (
      SELECT 1 FROM public.user_achievements 
      WHERE user_achievements.user_id = user_id_param 
      AND user_achievements.achievement_id = achievements.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.ready_to_claim_achievements
      WHERE ready_to_claim_achievements.user_id = user_id_param
      AND ready_to_claim_achievements.achievement_id = achievements.id
    )
  LOOP
    -- Check if achievement criteria is met
    IF (
      -- Existing achievement types
      (achievement.criteria->>'type' = 'user_level' AND user_stats.user_level >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'total_games' AND user_stats.total_games >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'total_wins' AND user_stats.total_wins >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'total_wagered' AND user_stats.total_wagered >= (achievement.criteria->>'value')::DECIMAL) OR
      (achievement.criteria->>'type' = 'total_profit' AND user_stats.total_profit >= (achievement.criteria->>'value')::DECIMAL) OR
      (achievement.criteria->>'type' = 'biggest_win' AND user_stats.biggest_win >= (achievement.criteria->>'value')::DECIMAL) OR
      (achievement.criteria->>'type' = 'biggest_single_bet' AND user_stats.biggest_single_bet >= (achievement.criteria->>'value')::DECIMAL) OR
      (achievement.criteria->>'type' = 'login_days' AND user_stats.login_days_count >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'chat_messages' AND user_stats.chat_messages_count >= (achievement.criteria->>'value')::INTEGER) OR
      
      -- Roulette achievements
      (achievement.criteria->>'type' = 'roulette_games' AND user_stats.roulette_games >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'roulette_wins' AND user_stats.roulette_wins >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'roulette_biggest_win' AND user_stats.roulette_highest_win >= (achievement.criteria->>'value')::DECIMAL) OR
      (achievement.criteria->>'type' = 'roulette_profit' AND user_stats.roulette_profit >= (achievement.criteria->>'value')::DECIMAL) OR
      (achievement.criteria->>'type' = 'roulette_best_streak' AND user_stats.roulette_best_streak >= (achievement.criteria->>'value')::INTEGER) OR
      
      -- Coinflip achievements  
      (achievement.criteria->>'type' = 'coinflip_games' AND user_stats.coinflip_games >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'coinflip_wins' AND user_stats.coinflip_wins >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'coinflip_best_streak' AND user_stats.best_coinflip_streak >= (achievement.criteria->>'value')::INTEGER) OR
      
      -- Tower achievements (old types)
      (achievement.criteria->>'type' = 'tower_games' AND user_stats.tower_games >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'tower_wins' AND user_stats.tower_wins >= (achievement.criteria->>'value')::INTEGER) OR
      (achievement.criteria->>'type' = 'tower_highest_level' AND user_stats.tower_highest_level >= (achievement.criteria->>'value')::INTEGER) OR
      
      -- NEW: Tower completion achievements (difficulty-specific)
      (achievement.criteria->>'type' = 'tower_completion' AND 
       achievement.criteria->>'difficulty' = 'easy' AND 
       user_stats.tower_easy_completions >= 1) OR
       
      (achievement.criteria->>'type' = 'tower_completion' AND 
       achievement.criteria->>'difficulty' = 'medium' AND 
       user_stats.tower_medium_completions >= 1) OR
       
      (achievement.criteria->>'type' = 'tower_completion' AND 
       achievement.criteria->>'difficulty' = 'hard' AND 
       user_stats.tower_hard_completions >= 1) OR
       
      (achievement.criteria->>'type' = 'tower_completion' AND 
       achievement.criteria->>'difficulty' = 'extreme' AND 
       user_stats.tower_extreme_completions >= 1)
    ) THEN
      -- Mark achievement as ready to claim
      INSERT INTO public.ready_to_claim_achievements (user_id, achievement_id)
      VALUES (user_id_param, achievement.id)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Note: The user_level_stats table will need to be updated to track difficulty-specific completions
-- This should be done by adding columns: tower_easy_completions, tower_medium_completions, tower_hard_completions, tower_extreme_completions
-- These will be incremented when a user completes a tower game (reaches max level for that difficulty)