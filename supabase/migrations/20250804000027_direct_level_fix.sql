-- 🔧 DIRECT LEVEL FIX: Manual update for test user
-- Directly fix the test user's level and debug the calculation

BEGIN;

-- First, let's see what calculate_level_from_xp returns for 1011 XP
SELECT 
  'Testing calculate_level_from_xp(1011):' as test,
  user_level,
  current_level_xp,
  xp_to_next
FROM public.calculate_level_from_xp(1011);

-- Check the level requirements
SELECT 
  'Level requirements:' as info,
  level,
  xp_required 
FROM public.level_xp_requirements 
WHERE level IN (1, 2, 3)
ORDER BY level;

-- Check current test user stats
SELECT 
  'Current test user stats:' as info,
  current_level,
  lifetime_xp,
  current_level_xp,
  xp_to_next_level
FROM public.user_level_stats 
WHERE user_id = '7420ed48-4a12-4544-b5b6-05a52293ba22';

-- Manually calculate what the level should be
WITH manual_calc AS (
  SELECT 
    1011 as total_xp,
    651 as level_1_req,
    1011 - 651 as remaining_xp,
    CASE 
      WHEN 1011 >= 651 THEN 2
      ELSE 1 
    END as should_be_level
)
SELECT 
  'Manual calculation:' as info,
  total_xp,
  level_1_req,
  remaining_xp,
  should_be_level
FROM manual_calc;

-- Now directly update the test user to Level 2
UPDATE public.user_level_stats
SET 
  current_level = 2,
  current_level_xp = 360,
  xp_to_next_level = 291,
  updated_at = now()
WHERE user_id = '7420ed48-4a12-4544-b5b6-05a52293ba22'
  AND current_level = 1;  -- Only update if still Level 1

-- Verify the update worked
SELECT 
  'Test user AFTER manual update:' as info,
  current_level,
  lifetime_xp,
  current_level_xp,
  xp_to_next_level,
  CASE 
    WHEN current_level = 2 THEN 'SUCCESS: Now Level 2!'
    ELSE 'FAILED: Still Level ' || current_level
  END as result
FROM public.user_level_stats 
WHERE user_id = '7420ed48-4a12-4544-b5b6-05a52293ba22';

-- Also check if there are any other users with similar issues
SELECT 
  'Users with potential level issues:' as info,
  COUNT(*) as count_users
FROM public.user_level_stats 
WHERE lifetime_xp >= 651 AND current_level = 1;

-- Show any users who have enough XP for Level 2+ but are still Level 1
SELECT 
  'Users stuck at Level 1:' as info,
  user_id,
  current_level,
  lifetime_xp,
  current_level_xp
FROM public.user_level_stats 
WHERE lifetime_xp >= 651 AND current_level = 1
LIMIT 5;

COMMIT;