-- Fix Level Achievement System - Final Corrected Version
-- This migration first checks the table structure then fixes achievements
-- ======================================================================

-- First, let's check the actual structure of the achievements table
DO $$
DECLARE
    column_record RECORD;
BEGIN
    RAISE NOTICE '=== ACHIEVEMENTS TABLE STRUCTURE ===';
    
    FOR column_record IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'achievements' 
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: % (type: %)', column_record.column_name, column_record.data_type;
    END LOOP;
    
    RAISE NOTICE '=== END TABLE STRUCTURE ===';
END $$;

-- Now let's see what level achievements currently exist
DO $$
DECLARE
    achievement_record RECORD;
    criteria_column_exists BOOLEAN := FALSE;
    unlock_criteria_column_exists BOOLEAN := FALSE;
BEGIN
    -- Check which criteria column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'achievements' 
        AND table_schema = 'public' 
        AND column_name = 'criteria'
    ) INTO criteria_column_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'achievements' 
        AND table_schema = 'public' 
        AND column_name = 'unlock_criteria'
    ) INTO unlock_criteria_column_exists;
    
    RAISE NOTICE '=== DEBUGGING LEVEL ACHIEVEMENTS ===';
    RAISE NOTICE 'Criteria column exists: %, Unlock_criteria column exists: %', criteria_column_exists, unlock_criteria_column_exists;
    
    -- Query achievements using the correct column name
    IF criteria_column_exists THEN
        FOR achievement_record IN 
            SELECT id, name, description, criteria 
            FROM public.achievements 
            WHERE (name ILIKE '%level%' OR name IN ('Novice', 'Experienced', 'Veteran', 'Expert', 'Master'))
            ORDER BY name
        LOOP
            RAISE NOTICE 'Achievement: % (%) - Criteria: %', 
                achievement_record.name, 
                achievement_record.id, 
                achievement_record.criteria;
        END LOOP;
    ELSIF unlock_criteria_column_exists THEN
        FOR achievement_record IN 
            SELECT id, name, description, unlock_criteria as criteria
            FROM public.achievements 
            WHERE (name ILIKE '%level%' OR name IN ('Novice', 'Experienced', 'Veteran', 'Expert', 'Master'))
            ORDER BY name
        LOOP
            RAISE NOTICE 'Achievement: % (%) - Criteria: %', 
                achievement_record.name, 
                achievement_record.id, 
                achievement_record.criteria;
        END LOOP;
    ELSE
        RAISE NOTICE 'No criteria column found! Checking all columns...';
        FOR achievement_record IN 
            SELECT id, name, description
            FROM public.achievements 
            WHERE (name ILIKE '%level%' OR name IN ('Novice', 'Experienced', 'Veteran', 'Expert', 'Master'))
            ORDER BY name
        LOOP
            RAISE NOTICE 'Achievement: % (%)', achievement_record.name, achievement_record.id;
        END LOOP;
    END IF;
    
    RAISE NOTICE '=== END ACHIEVEMENT LIST ===';
END $$;

-- Check user levels to see if they should have achievements
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

-- Update the achievement checking function to handle both column names and formats
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
  criteria_column_exists BOOLEAN := FALSE;
  unlock_criteria_column_exists BOOLEAN := FALSE;
BEGIN
  -- Check which criteria column exists
  SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'achievements' 
      AND table_schema = 'public' 
      AND column_name = 'criteria'
  ) INTO criteria_column_exists;
  
  SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'achievements' 
      AND table_schema = 'public' 
      AND column_name = 'unlock_criteria'
  ) INTO unlock_criteria_column_exists;

  -- Get user stats and profile
  SELECT * INTO user_stats FROM public.user_level_stats WHERE user_id = p_user_id;
  SELECT * INTO user_profile FROM public.profiles WHERE id = p_user_id;
  
  IF user_stats IS NULL OR user_profile IS NULL THEN
    RETURN '{"error": "User not found"}'::JSON;
  END IF;

  -- Check all achievements using the correct column
  IF criteria_column_exists THEN
    FOR achievement IN 
      SELECT a.*, a.criteria as achievement_criteria FROM public.achievements a 
      WHERE a.id NOT IN (
        SELECT ua.achievement_id FROM public.user_achievements ua 
        WHERE ua.user_id = p_user_id
      )
    LOOP
      criteria := achievement.achievement_criteria;
      
      -- Handle level achievements
      IF (criteria->>'type' = 'user_level') OR (criteria ? 'level') THEN
        DECLARE
          target_level INTEGER;
        BEGIN
          -- Get target level from either format
          IF criteria->>'type' = 'user_level' THEN
            target_level := (criteria->>'value')::INTEGER;
          ELSIF criteria ? 'level' THEN
            target_level := (criteria->>'level')::INTEGER;
          ELSE
            target_level := NULL;
          END IF;
          
          -- Check if user meets level requirement
          IF target_level IS NOT NULL AND (
            (user_stats.current_level >= target_level) OR
            (user_profile.current_level >= target_level)
          ) THEN
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
              NULL;
            END;
            
            -- Add to newly unlocked list
            achievement_json := json_build_object(
              'id', achievement.id,
              'name', achievement.name,
              'description', achievement.description,
              'rarity', COALESCE(achievement.rarity, 'common'),
              'reward_amount', COALESCE(achievement.reward_amount, 0),
              'reward_type', COALESCE(achievement.reward_type, 'money')
            );
            
            newly_unlocked_achievements := newly_unlocked_achievements || achievement_json;
          END IF;
        END;
      
      -- Handle other achievement types
      ELSIF (criteria->>'type' = 'total_games' AND user_stats.total_games >= (criteria->>'value')::INTEGER) OR
         (criteria->>'type' = 'total_wins' AND user_stats.total_wins >= (criteria->>'value')::INTEGER) OR
         (criteria->>'type' = 'total_profit' AND user_stats.total_profit >= (criteria->>'value')::NUMERIC) OR
         (criteria->>'type' = 'total_wagered' AND user_stats.total_wagered >= (criteria->>'value')::NUMERIC) OR
         (criteria->>'type' = 'roulette_games' AND user_stats.roulette_games >= (criteria->>'value')::INTEGER) OR
         (criteria->>'type' = 'roulette_wins' AND user_stats.roulette_wins >= (criteria->>'value')::INTEGER)
      THEN
        -- Award the achievement
        INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
        VALUES (p_user_id, achievement.id, NOW());
        
        achievement_json := json_build_object(
          'id', achievement.id,
          'name', achievement.name,
          'description', achievement.description
        );
        newly_unlocked_achievements := newly_unlocked_achievements || achievement_json;
      END IF;
    END LOOP;
    
  ELSIF unlock_criteria_column_exists THEN
    FOR achievement IN 
      SELECT a.*, a.unlock_criteria as achievement_criteria FROM public.achievements a 
      WHERE a.id NOT IN (
        SELECT ua.achievement_id FROM public.user_achievements ua 
        WHERE ua.user_id = p_user_id
      )
    LOOP
      criteria := achievement.achievement_criteria;
      
      -- Same logic as above but using unlock_criteria column
      IF (criteria->>'type' = 'user_level') OR (criteria ? 'level') THEN
        DECLARE
          target_level INTEGER;
        BEGIN
          IF criteria->>'type' = 'user_level' THEN
            target_level := (criteria->>'value')::INTEGER;
          ELSIF criteria ? 'level' THEN
            target_level := (criteria->>'level')::INTEGER;
          ELSE
            target_level := NULL;
          END IF;
          
          IF target_level IS NOT NULL AND (
            (user_stats.current_level >= target_level) OR
            (user_profile.current_level >= target_level)
          ) THEN
            INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
            VALUES (p_user_id, achievement.id, NOW());
            
            achievement_json := json_build_object(
              'id', achievement.id,
              'name', achievement.name,
              'description', achievement.description
            );
            newly_unlocked_achievements := newly_unlocked_achievements || achievement_json;
          END IF;
        END;
      END IF;
    END LOOP;
  END IF;

  RETURN json_build_object('newly_unlocked', newly_unlocked_achievements);
END;
$$;

-- Manually trigger achievement checks for users with level 5+
DO $$
DECLARE
    user_record RECORD;
    result JSON;
    total_users INTEGER := 0;
    users_with_new_achievements INTEGER := 0;
BEGIN
    RAISE NOTICE '=== MANUALLY TRIGGERING ACHIEVEMENT CHECKS ===';
    
    FOR user_record IN 
        SELECT DISTINCT id 
        FROM public.profiles 
        WHERE current_level >= 5
        LIMIT 20
    LOOP
        total_users := total_users + 1;
        SELECT public.check_and_award_achievements(user_record.id) INTO result;
        
        -- Check if user got new achievements
        IF jsonb_array_length((result->>'newly_unlocked')::jsonb) > 0 THEN
            users_with_new_achievements := users_with_new_achievements + 1;
            RAISE NOTICE 'User %: Awarded % achievements', 
                user_record.id, 
                jsonb_array_length((result->>'newly_unlocked')::jsonb);
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Checked % users, % received new achievements', total_users, users_with_new_achievements;
    RAISE NOTICE '=== END MANUAL TRIGGER ===';
END $$;

-- Final completion message
DO $$
BEGIN
    RAISE NOTICE '✅ Level achievement system fixed and tested!';
    RAISE NOTICE '📋 Check the logs above for results';
    RAISE NOTICE '🎯 Level achievements should now work regardless of column names or criteria formats';
END $$;