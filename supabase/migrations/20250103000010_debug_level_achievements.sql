-- Debug Level Achievement System
-- Check what achievements exist and manually trigger checks
-- ========================================================

-- First, let's see what level achievements currently exist
DO $$
DECLARE
    achievement_record RECORD;
BEGIN
    RAISE NOTICE '=== DEBUGGING LEVEL ACHIEVEMENTS ===';
    
    -- Check all achievements with "level" in name or criteria
    FOR achievement_record IN 
        SELECT id, name, description, unlock_criteria 
        FROM public.achievements 
        WHERE (name ILIKE '%level%' OR name IN ('Novice', 'Experienced', 'Veteran', 'Expert', 'Master'))
        ORDER BY name
    LOOP
        RAISE NOTICE 'Achievement: % (%) - Criteria: %', 
            achievement_record.name, 
            achievement_record.id, 
            achievement_record.unlock_criteria;
    END LOOP;
    
    RAISE NOTICE '=== END ACHIEVEMENT LIST ===';
END $$;

-- Check a specific user's level to see if they should have achievements
DO $$
DECLARE
    user_record RECORD;
    user_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== CHECKING USER LEVELS ===';
    
    -- Check a few users and their levels
    FOR user_record IN 
        SELECT p.id, p.current_level, uls.current_level as stats_level
        FROM public.profiles p
        LEFT JOIN public.user_level_stats uls ON p.id = uls.user_id
        WHERE p.current_level >= 5
        LIMIT 5
    LOOP
        user_count := user_count + 1;
        RAISE NOTICE 'User % - Profile Level: %, Stats Level: %', 
            user_record.id, 
            user_record.current_level, 
            user_record.stats_level;
            
        -- Check what achievements they already have
        DECLARE
            achievement_count INTEGER;
        BEGIN
            SELECT COUNT(*) INTO achievement_count
            FROM public.user_achievements ua
            JOIN public.achievements a ON ua.achievement_id = a.id
            WHERE ua.user_id = user_record.id
            AND a.name IN ('Novice', 'Experienced', 'Veteran', 'Expert', 'Master');
            
            RAISE NOTICE '  - Has % level achievements', achievement_count;
        END;
    END LOOP;
    
    IF user_count = 0 THEN
        RAISE NOTICE 'No users found with level 5+';
    END IF;
    
    RAISE NOTICE '=== END USER CHECK ===';
END $$;

-- Fix the achievement checking function to ensure it properly handles user_level
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
  debug_log TEXT := '';
BEGIN
  -- Get user stats and profile
  SELECT * INTO user_stats FROM public.user_level_stats WHERE user_id = p_user_id;
  SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
  
  IF user_stats IS NULL OR user_profile IS NULL THEN
    RETURN json_build_object('error', 'User not found', 'debug', 'user_stats or user_profile is null');
  END IF;

  debug_log := 'User level from stats: ' || COALESCE(user_stats.current_level::TEXT, 'null') || 
               ', from profile: ' || COALESCE(user_profile.current_level::TEXT, 'null');

  -- Check all achievements
  FOR achievement IN 
    SELECT a.* FROM public.achievements a 
    WHERE a.id NOT IN (
      SELECT ua.achievement_id FROM public.user_achievements ua 
      WHERE ua.user_id = p_user_id
    )
  LOOP
    criteria := achievement.unlock_criteria;
    
    -- Special handling for level achievements
    IF criteria->>'type' = 'user_level' THEN
      debug_log := debug_log || '; Checking ' || achievement.name || ' (requires level ' || (criteria->>'value') || ')';
      
      -- Check both stats and profile for current level
      IF (user_stats.current_level >= (criteria->>'value')::INTEGER) OR
         (user_profile.current_level >= (criteria->>'value')::INTEGER) THEN
        
        debug_log := debug_log || ' - UNLOCKED!';
        
        -- Award the achievement
        INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
        VALUES (p_user_id, achievement.id, NOW());
        
        -- Try to award the reward (might fail if function doesn't exist)
        BEGIN
          PERFORM public.award_achievement_reward(
            p_user_id, 
            achievement.id, 
            achievement.reward_amount, 
            achievement.reward_type
          );
        EXCEPTION WHEN OTHERS THEN
          debug_log := debug_log || ' (reward failed: ' || SQLERRM || ')';
        END;
        
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
      ELSE
        debug_log := debug_log || ' - not met';
      END IF;
    
    -- Handle old format level achievements (criteria with "level" key)
    ELSIF criteria ? 'level' THEN
      debug_log := debug_log || '; Checking OLD format ' || achievement.name || ' (requires level ' || (criteria->>'level') || ')';
      
      IF (user_stats.current_level >= (criteria->>'level')::INTEGER) OR
         (user_profile.current_level >= (criteria->>'level')::INTEGER) THEN
        
        debug_log := debug_log || ' - UNLOCKED!';
        
        -- Award the achievement
        INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
        VALUES (p_user_id, achievement.id, NOW());
        
        -- Try to award the reward
        BEGIN
          PERFORM public.award_achievement_reward(
            p_user_id, 
            achievement.id, 
            achievement.reward_amount, 
            achievement.reward_type
          );
        EXCEPTION WHEN OTHERS THEN
          debug_log := debug_log || ' (reward failed: ' || SQLERRM || ')';
        END;
        
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
      ELSE
        debug_log := debug_log || ' - not met';
      END IF;
    
    -- Handle all other achievement types as before
    ELSIF (criteria->>'type' = 'total_games' AND user_stats.total_games >= (criteria->>'value')::INTEGER) OR
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
       (criteria->>'type' = 'biggest_single_bet' AND user_stats.biggest_single_bet >= (criteria->>'value')::NUMERIC)
    THEN
      -- Award the achievement
      INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
      VALUES (p_user_id, achievement.id, NOW());
      
      -- Try to award the reward
      BEGIN
        PERFORM public.award_achievement_reward(
          p_user_id, 
          achievement.id, 
          achievement.reward_amount, 
          achievement.reward_type
        );
      EXCEPTION WHEN OTHERS THEN
        -- Ignore reward errors for now
        NULL;
      END;
      
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

  RETURN json_build_object(
    'newly_unlocked', newly_unlocked_achievements,
    'debug', debug_log
  );
END;
$$;

-- Manually trigger achievement checks for users with level 5+
DO $$
DECLARE
    user_record RECORD;
    result JSON;
BEGIN
    RAISE NOTICE '=== MANUALLY TRIGGERING ACHIEVEMENT CHECKS ===';
    
    FOR user_record IN 
        SELECT DISTINCT id 
        FROM public.profiles 
        WHERE current_level >= 5
        LIMIT 10
    LOOP
        SELECT public.check_and_award_achievements(user_record.id) INTO result;
        RAISE NOTICE 'User %: %', user_record.id, result;
    END LOOP;
    
    RAISE NOTICE '=== END MANUAL TRIGGER ===';
END $$;

RAISE NOTICE '✅ Level achievement debugging completed!';
RAISE NOTICE '📋 Check the logs above for achievement status and any issues';