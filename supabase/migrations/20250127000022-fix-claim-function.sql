-- Fix the claim function to ensure it properly removes achievements and credits rewards
-- This migration will debug and fix the claim_achievement_manual function

-- Step 1: Check current function definition
SELECT 'CURRENT CLAIM FUNCTION' as info;
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'claim_achievement_manual';

-- Step 2: Drop and recreate the function with better error handling
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
  ready_to_claim_exists BOOLEAN;
  already_unlocked BOOLEAN;
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
  
  -- Check if achievement is ready to claim
  SELECT EXISTS(
    SELECT 1 FROM public.ready_to_claim_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO ready_to_claim_exists;
  
  IF NOT ready_to_claim_exists THEN
    RAISE NOTICE 'Achievement not ready to claim for user: %', p_user_id;
    RETURN '{"error": "Achievement not ready to claim"}'::JSON;
  END IF;
  
  RAISE NOTICE 'Achievement is ready to claim';
  
  -- Check if already unlocked
  SELECT EXISTS(
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO already_unlocked;
  
  IF already_unlocked THEN
    RAISE NOTICE 'Achievement already unlocked for user: %', p_user_id;
    RETURN '{"error": "Achievement already unlocked"}'::JSON;
  END IF;
  
  RAISE NOTICE 'Achievement not already unlocked, proceeding with claim';
  
  reward_amount := achievement.reward_amount;
  reward_type := achievement.reward_type;
  
  RAISE NOTICE 'Reward details: type=%, amount=%', reward_type, reward_amount;
  
  -- Insert into user_achievements (mark as unlocked)
  INSERT INTO public.user_achievements (user_id, achievement_id, unlocked_at)
  VALUES (p_user_id, p_achievement_id, now());
  
  RAISE NOTICE 'Achievement inserted into user_achievements';
  
  -- Remove from ready_to_claim_achievements
  DELETE FROM public.ready_to_claim_achievements 
  WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
  
  RAISE NOTICE 'Achievement removed from ready_to_claim_achievements';
  
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

-- Step 3: Test the function with a sample ready-to-claim achievement
DO $$
DECLARE
  test_user_id UUID;
  test_achievement_id UUID;
  claim_result JSON;
BEGIN
  -- Get a sample ready-to-claim achievement
  SELECT rta.user_id, rta.achievement_id 
  INTO test_user_id, test_achievement_id
  FROM public.ready_to_claim_achievements rta
  LIMIT 1;
  
  IF test_user_id IS NOT NULL AND test_achievement_id IS NOT NULL THEN
    RAISE NOTICE 'Testing fixed claim function for user % and achievement %', test_user_id, test_achievement_id;
    
    -- Test the claim function
    SELECT public.claim_achievement_manual(test_user_id, test_achievement_id) INTO claim_result;
    
    RAISE NOTICE 'Claim result: %', claim_result;
  ELSE
    RAISE NOTICE 'No ready-to-claim achievements found for testing';
  END IF;
END $$;

-- Step 4: Verify the function parameters
SELECT 'FUNCTION PARAMETERS' as info;
SELECT 
  parameter_name,
  parameter_mode,
  data_type
FROM information_schema.parameters 
WHERE specific_schema = 'public' 
AND specific_name = 'claim_achievement_manual'
ORDER BY ordinal_position;

-- Step 5: Check current ready-to-claim achievements
SELECT 'CURRENT READY TO CLAIM ACHIEVEMENTS' as info;
SELECT 
  rta.user_id,
  rta.achievement_id,
  rta.ready_at,
  a.name as achievement_name,
  a.reward_amount,
  a.reward_type
FROM public.ready_to_claim_achievements rta
JOIN public.achievements a ON rta.achievement_id = a.id
LIMIT 10;