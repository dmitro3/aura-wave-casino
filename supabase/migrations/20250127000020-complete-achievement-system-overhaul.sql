-- Complete Achievement System Overhaul
-- This migration ensures achievements ONLY move to "Ready to Claim" and stay there until manually claimed

-- Step 1: Check current state
SELECT 'CURRENT TRIGGERS' as info;
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (event_object_table = 'user_level_stats' OR event_object_table = 'profiles');

SELECT 'CURRENT FUNCTIONS' as info;
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%achievement%';

-- Step 2: Drop ALL existing triggers and functions
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS check_ready_achievements_trigger ON public.user_level_stats;
DROP TRIGGER IF EXISTS check_achievements_trigger ON public.profiles;
DROP TRIGGER IF EXISTS check_ready_achievements_trigger ON public.profiles;

DROP FUNCTION IF EXISTS public.check_and_award_achievements(uuid);
DROP FUNCTION IF EXISTS public.check_ready_achievements(uuid);
DROP FUNCTION IF EXISTS public.trigger_check_ready_achievements();
DROP FUNCTION IF EXISTS public.trigger_check_achievements();

-- Step 3: Create a new table for ready-to-claim achievements
CREATE TABLE IF NOT EXISTS public.ready_to_claim_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  ready_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS on the new table
ALTER TABLE public.ready_to_claim_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for ready_to_claim_achievements
CREATE POLICY "Users can view own ready achievements" ON public.ready_to_claim_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ready achievements" ON public.ready_to_claim_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ready achievements" ON public.ready_to_claim_achievements
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to ready achievements" ON public.ready_to_claim_achievements
  FOR ALL USING (auth.role() = 'service_role');

-- Step 4: Create a function that ONLY checks for ready achievements (NO auto-claiming)
CREATE OR REPLACE FUNCTION public.check_for_ready_achievements(
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

  -- Check all achievements for ready-to-claim status
  FOR achievement IN 
    SELECT a.* FROM public.achievements a 
    WHERE a.id NOT IN (
      SELECT ua.achievement_id FROM public.user_achievements ua 
      WHERE ua.user_id = p_user_id
    )
    AND a.id NOT IN (
      SELECT rta.achievement_id FROM public.ready_to_claim_achievements rta 
      WHERE rta.user_id = p_user_id
    )
  LOOP
    -- Check if criteria is met based on type
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
      -- Add to ready_to_claim_achievements table
      INSERT INTO public.ready_to_claim_achievements (user_id, achievement_id)
      VALUES (p_user_id, achievement.id)
      ON CONFLICT (user_id, achievement_id) DO NOTHING;
      
      -- Add to ready achievements list for response
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

-- Step 5: Create a trigger function that calls the ready achievements check
CREATE OR REPLACE FUNCTION public.trigger_check_ready_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Call the function to check for ready achievements
  PERFORM public.check_for_ready_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Step 6: Create the trigger on user_level_stats updates
CREATE TRIGGER check_ready_achievements_trigger
  AFTER UPDATE ON public.user_level_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_check_ready_achievements();

-- Step 7: Create a function to manually claim an achievement
CREATE OR REPLACE FUNCTION public.claim_achievement_manual(
  p_user_id UUID,
  p_achievement_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  achievement RECORD;
  reward_amount INTEGER;
  reward_type TEXT;
BEGIN
  -- Get achievement details
  SELECT * INTO achievement FROM public.achievements WHERE id = p_achievement_id;
  
  IF achievement IS NULL THEN
    RETURN '{"error": "Achievement not found"}'::JSON;
  END IF;
  
  -- Check if achievement is ready to claim
  IF NOT EXISTS (
    SELECT 1 FROM public.ready_to_claim_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) THEN
    RETURN '{"error": "Achievement not ready to claim"}'::JSON;
  END IF;
  
  -- Check if already unlocked
  IF EXISTS (
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) THEN
    RETURN '{"error": "Achievement already unlocked"}'::JSON;
  END IF;
  
  reward_amount := achievement.reward_amount;
  reward_type := achievement.reward_type;
  
  -- Insert into user_achievements (mark as unlocked)
  INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
  VALUES (p_user_id, p_achievement_id, now());
  
  -- Remove from ready_to_claim_achievements
  DELETE FROM public.ready_to_claim_achievements 
  WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
  
  -- Award the reward
  IF reward_type = 'money' THEN
    UPDATE public.profiles 
    SET balance = balance + reward_amount
    WHERE id = p_user_id;
  ELSIF reward_type = 'xp' THEN
    UPDATE public.user_level_stats 
    SET lifetime_xp = lifetime_xp + reward_amount,
        current_level_xp = current_level_xp + reward_amount
    WHERE user_id = p_user_id;
  ELSIF reward_type = 'cases' THEN
    UPDATE public.user_level_stats 
    SET available_cases = available_cases + reward_amount
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Achievement claimed successfully',
    'reward_amount', reward_amount,
    'reward_type', reward_type
  );
END;
$$;

-- Step 8: Verify the new system
SELECT 'VERIFICATION - TRIGGERS' as info;
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  event_object_table
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND (event_object_table = 'user_level_stats' OR event_object_table = 'profiles');

SELECT 'VERIFICATION - FUNCTIONS' as info;
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%achievement%';

SELECT 'VERIFICATION - READY TO CLAIM TABLE' as info;
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ready_to_claim_achievements';