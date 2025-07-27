-- Separate unlock status from claim status
-- This migration ensures achievements can be unlocked but remain unclaimed until manually claimed

-- Step 1: Add claimed_at column to user_achievements table
ALTER TABLE public.user_achievements 
ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Step 2: Update existing user_achievements to mark them as claimed
UPDATE public.user_achievements 
SET claimed_at = unlocked_at 
WHERE claimed_at IS NULL;

-- Step 3: Create a new table for unlocked but unclaimed achievements
CREATE TABLE IF NOT EXISTS public.unlocked_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS on the new table
ALTER TABLE public.unlocked_achievements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for unlocked_achievements
CREATE POLICY "Users can view own unlocked achievements" ON public.unlocked_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own unlocked achievements" ON public.unlocked_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own unlocked achievements" ON public.unlocked_achievements
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to unlocked achievements" ON public.unlocked_achievements
  FOR ALL USING (auth.role() = 'service_role');

-- Step 4: Update the check_for_ready_achievements function to use unlocked_achievements
DROP FUNCTION IF EXISTS public.check_for_ready_achievements(uuid);

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
      WHERE ua.user_id = p_user_id AND ua.claimed_at IS NOT NULL
    )
    AND a.id NOT IN (
      SELECT ua.achievement_id FROM public.unlocked_achievements ua 
      WHERE ua.user_id = p_user_id
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
      -- Add to unlocked_achievements table (unlocked but not claimed)
      INSERT INTO public.unlocked_achievements (user_id, achievement_id)
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

-- Step 5: Update the claim function to handle the new structure
DROP FUNCTION IF EXISTS public.claim_achievement_manual(uuid, uuid);

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
  unlocked_exists BOOLEAN;
  already_claimed BOOLEAN;
  result JSON;
BEGIN
  -- Log the function call
  RAISE NOTICE 'claim_achievement_manual called with user_id: %, achievement_id: %', p_user_id, p_achievement_id;
  
  -- Get achievement details
  SELECT * INTO achievement FROM public.achievements WHERE id = p_achievement_id;
  
  IF achievement IS NULL THEN
    RAISE NOTICE 'Achievement not found: %', p_achievement_id;
    RETURN '{"error": "Achievement not found"}'::JSON;
  END IF;
  
  RAISE NOTICE 'Found achievement: %', achievement.name;
  
  -- Check if already claimed
  SELECT EXISTS(
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id AND claimed_at IS NOT NULL
  ) INTO already_claimed;
  
  IF already_claimed THEN
    RAISE NOTICE 'Achievement already claimed for user: %', p_user_id;
    RETURN '{"error": "Achievement already claimed"}'::JSON;
  END IF;
  
  RAISE NOTICE 'Achievement not already claimed, checking if unlocked';
  
  -- Check if achievement is unlocked (ready to claim)
  SELECT EXISTS(
    SELECT 1 FROM public.unlocked_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO unlocked_exists;
  
  IF NOT unlocked_exists THEN
    RAISE NOTICE 'Achievement not unlocked for user: %', p_user_id;
    RETURN '{"error": "Achievement not unlocked"}'::JSON;
  END IF;
  
  RAISE NOTICE 'Achievement is unlocked, proceeding with claim';
  
  reward_amount := achievement.reward_amount;
  reward_type := achievement.reward_type;
  
  RAISE NOTICE 'Reward details: type=%, amount=%', reward_type, reward_amount;
  
  -- Insert or update user_achievements (mark as claimed)
  INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at, claimed_at)
  VALUES (p_user_id, p_achievement_id, now(), now())
  ON CONFLICT (user_id, achievement_id) 
  DO UPDATE SET claimed_at = now();
  
  RAISE NOTICE 'Achievement marked as claimed in user_achievements';
  
  -- Remove from unlocked_achievements
  DELETE FROM public.unlocked_achievements 
  WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
  
  RAISE NOTICE 'Achievement removed from unlocked_achievements';
  
  -- Award the reward
  IF reward_type = 'money' THEN
    UPDATE public.profiles 
    SET balance = balance + reward_amount
    WHERE id = p_user_id;
    RAISE NOTICE 'Money reward awarded: +%', reward_amount;
  ELSIF reward_type = 'xp' THEN
    UPDATE public.user_level_stats 
    SET lifetime_xp = lifetime_xp + reward_amount,
        current_level_xp = current_level_xp + reward_amount
    WHERE user_id = p_user_id;
    RAISE NOTICE 'XP reward awarded: +%', reward_amount;
  ELSIF reward_type = 'cases' THEN
    UPDATE public.user_level_stats 
    SET available_cases = available_cases + reward_amount
    WHERE user_id = p_user_id;
    RAISE NOTICE 'Cases reward awarded: +%', reward_amount;
  END IF;
  
  result := json_build_object(
    'success', true,
    'message', 'Achievement claimed successfully',
    'reward_amount', reward_amount,
    'reward_type', reward_type,
    'achievement_name', achievement.name
  );
  
  RAISE NOTICE 'Claim successful, returning: %', result;
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in claim_achievement_manual: %', SQLERRM;
    RETURN json_build_object(
      'error', 'Database error during claim',
      'details', SQLERRM
    );
END;
$$;

-- Step 6: Clean up old ready_to_claim_achievements table
-- Move any remaining achievements to unlocked_achievements
INSERT INTO public.unlocked_achievements (user_id, achievement_id)
SELECT user_id, achievement_id FROM public.ready_to_claim_achievements
ON CONFLICT (user_id, achievement_id) DO NOTHING;

-- Drop the old table
DROP TABLE IF EXISTS public.ready_to_claim_achievements;

-- Step 7: Test the new system
DO $$
DECLARE
  test_user_id UUID;
  test_achievement_id UUID;
  claim_result JSON;
BEGIN
  -- Get a sample unlocked achievement
  SELECT ua.user_id, ua.achievement_id 
  INTO test_user_id, test_achievement_id
  FROM public.unlocked_achievements ua
  LIMIT 1;
  
  IF test_user_id IS NOT NULL AND test_achievement_id IS NOT NULL THEN
    RAISE NOTICE 'Testing new claim function for user % and achievement %', test_user_id, test_achievement_id;
    
    -- Test the claim function
    SELECT public.claim_achievement_manual(test_user_id, test_achievement_id) INTO claim_result;
    
    RAISE NOTICE 'Claim result: %', claim_result;
  ELSE
    RAISE NOTICE 'No unlocked achievements found for testing';
  END IF;
END $$;

-- Step 8: Show final state
SELECT 'FINAL UNLOCKED ACHIEVEMENTS' as info;
SELECT 
  ua.user_id,
  ua.achievement_id,
  a.name as achievement_name,
  a.reward_amount,
  a.reward_type,
  ua.unlocked_at
FROM public.unlocked_achievements ua
JOIN public.achievements a ON ua.achievement_id = a.id
LIMIT 10;

SELECT 'FINAL CLAIMED ACHIEVEMENTS' as info;
SELECT 
  ua.user_id,
  ua.achievement_id,
  a.name as achievement_name,
  a.reward_amount,
  a.reward_type,
  ua.unlocked_at,
  ua.claimed_at
FROM public.user_achievements ua
JOIN public.achievements a ON ua.achievement_id = a.id
WHERE ua.claimed_at IS NOT NULL
ORDER BY ua.claimed_at DESC
LIMIT 10;