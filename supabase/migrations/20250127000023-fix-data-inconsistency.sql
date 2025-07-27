-- Fix data inconsistency between ready_to_claim_achievements and user_achievements
-- This migration will clean up the data and ensure consistency

-- Step 1: Check for data inconsistencies
SELECT 'CHECKING FOR DATA INCONSISTENCIES' as info;

-- Find achievements that are both ready to claim AND already unlocked
SELECT 'ACHIEVEMENTS BOTH READY TO CLAIM AND UNLOCKED' as info;
SELECT 
  rta.user_id,
  rta.achievement_id,
  a.name as achievement_name,
  rta.ready_at,
  ua.unlocked_at
FROM public.ready_to_claim_achievements rta
JOIN public.user_achievements ua ON rta.user_id = ua.user_id AND rta.achievement_id = ua.achievement_id
JOIN public.achievements a ON rta.achievement_id = a.id;

-- Step 2: Clean up the data inconsistency
-- Remove achievements from ready_to_claim_achievements if they're already in user_achievements
DELETE FROM public.ready_to_claim_achievements 
WHERE (user_id, achievement_id) IN (
  SELECT rta.user_id, rta.achievement_id
  FROM public.ready_to_claim_achievements rta
  JOIN public.user_achievements ua ON rta.user_id = ua.user_id AND rta.achievement_id = ua.achievement_id
);

-- Step 3: Verify the cleanup
SELECT 'VERIFICATION AFTER CLEANUP' as info;
SELECT 
  rta.user_id,
  rta.achievement_id,
  a.name as achievement_name,
  rta.ready_at
FROM public.ready_to_claim_achievements rta
JOIN public.achievements a ON rta.achievement_id = a.id
LIMIT 10;

-- Step 4: Update the claim function to handle this case better
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
  
  -- Check if already unlocked first
  SELECT EXISTS(
    SELECT 1 FROM public.user_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO already_unlocked;
  
  IF already_unlocked THEN
    RAISE NOTICE 'Achievement already unlocked for user: %', p_user_id;
    
    -- Clean up: remove from ready_to_claim_achievements if it exists there
    DELETE FROM public.ready_to_claim_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id;
    
    RAISE NOTICE 'Cleaned up ready_to_claim_achievements for already unlocked achievement';
    
    RETURN '{"error": "Achievement already unlocked"}'::JSON;
  END IF;
  
  RAISE NOTICE 'Achievement not already unlocked, checking if ready to claim';
  
  -- Check if achievement is ready to claim
  SELECT EXISTS(
    SELECT 1 FROM public.ready_to_claim_achievements 
    WHERE user_id = p_user_id AND achievement_id = p_achievement_id
  ) INTO ready_to_claim_exists;
  
  IF NOT ready_to_claim_exists THEN
    RAISE NOTICE 'Achievement not ready to claim for user: %', p_user_id;
    RETURN '{"error": "Achievement not ready to claim"}'::JSON;
  END IF;
  
  RAISE NOTICE 'Achievement is ready to claim, proceeding with claim';
  
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

-- Step 5: Test the updated function
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
    RAISE NOTICE 'Testing updated claim function for user % and achievement %', test_user_id, test_achievement_id;
    
    -- Test the claim function
    SELECT public.claim_achievement_manual(test_user_id, test_achievement_id) INTO claim_result;
    
    RAISE NOTICE 'Claim result: %', claim_result;
  ELSE
    RAISE NOTICE 'No ready-to-claim achievements found for testing';
  END IF;
END $$;

-- Step 6: Show final state
SELECT 'FINAL READY TO CLAIM ACHIEVEMENTS' as info;
SELECT 
  rta.user_id,
  rta.achievement_id,
  a.name as achievement_name,
  a.reward_amount,
  a.reward_type
FROM public.ready_to_claim_achievements rta
JOIN public.achievements a ON rta.achievement_id = a.id
LIMIT 10;

SELECT 'FINAL USER ACHIEVEMENTS' as info;
SELECT 
  ua.user_id,
  ua.achievement_id,
  a.name as achievement_name,
  a.reward_amount,
  a.reward_type,
  ua.unlocked_at
FROM public.user_achievements ua
JOIN public.achievements a ON ua.achievement_id = a.id
ORDER BY ua.unlocked_at DESC
LIMIT 10;