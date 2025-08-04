-- 🔍 SIMPLE TEST USER CHECK
-- Just check if the test user is now Level 2

SELECT 
  'TEST USER CURRENT STATE:' as status,
  user_id,
  current_level,
  lifetime_xp,
  current_level_xp,
  xp_to_next_level,
  CASE 
    WHEN current_level = 2 THEN '✅ SUCCESS: Level 2!'
    WHEN current_level = 1 THEN '❌ STILL BROKEN: Level 1'
    ELSE '❓ UNKNOWN: Level ' || current_level
  END as result
FROM public.user_level_stats 
WHERE user_id = '7420ed48-4a12-4544-b5b6-05a52293ba22';

-- Also test the calculation function
SELECT 
  'CALCULATION FUNCTION TEST:' as test,
  user_level as calculated_level,
  current_level_xp as calculated_current_xp,
  xp_to_next as calculated_xp_to_next
FROM public.calculate_level_from_xp(1011);