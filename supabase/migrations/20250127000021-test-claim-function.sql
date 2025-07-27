-- Test the claim function to ensure it's working properly
-- This migration will help debug any issues with the claim process

-- Step 1: Check if the claim function exists
SELECT 'CHECKING CLAIM FUNCTION' as info;
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'claim_achievement_manual';

-- Step 2: Check if ready_to_claim_achievements table exists
SELECT 'CHECKING READY TO CLAIM TABLE' as info;
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'ready_to_claim_achievements';

-- Step 3: Check current ready-to-claim achievements
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

-- Step 4: Check current user achievements
SELECT 'CURRENT USER ACHIEVEMENTS' as info;
SELECT 
  ua.user_id,
  ua.achievement_id,
  ua.unlocked_at,
  a.name as achievement_name,
  a.reward_amount,
  a.reward_type
FROM public.user_achievements ua
JOIN public.achievements a ON ua.achievement_id = a.id
LIMIT 10;

-- Step 5: Test the claim function with a sample achievement (if any exist)
-- This will help verify the function works correctly
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
    RAISE NOTICE 'Testing claim function for user % and achievement %', test_user_id, test_achievement_id;
    
    -- Test the claim function
    SELECT public.claim_achievement_manual(test_user_id, test_achievement_id) INTO claim_result;
    
    RAISE NOTICE 'Claim result: %', claim_result;
  ELSE
    RAISE NOTICE 'No ready-to-claim achievements found for testing';
  END IF;
END $$;

-- Step 6: Verify the function parameters
SELECT 'FUNCTION PARAMETERS' as info;
SELECT 
  parameter_name,
  parameter_mode,
  data_type
FROM information_schema.parameters 
WHERE specific_schema = 'public' 
AND specific_name = 'claim_achievement_manual'
ORDER BY ordinal_position;