-- 🔍 DEBUG RESULTS TABLE
-- Create a table with all debug information that you can query

BEGIN;

-- Create a temporary debug results table
CREATE TEMP TABLE debug_results (
  step_order integer,
  test_name text,
  result_data jsonb
);

-- Step 1: Test calculate_level_from_xp function
INSERT INTO debug_results (step_order, test_name, result_data)
SELECT 
  1,
  'calculate_level_from_xp(1011)',
  jsonb_build_object(
    'calculated_level', user_level,
    'calculated_current_xp', current_level_xp,
    'calculated_xp_to_next', xp_to_next
  )
FROM public.calculate_level_from_xp(1011);

-- Step 2: Level requirements
INSERT INTO debug_results (step_order, test_name, result_data)
SELECT 
  2,
  'level_requirements',
  jsonb_agg(
    jsonb_build_object(
      'level', level,
      'xp_required', xp_required
    ) ORDER BY level
  )
FROM public.level_xp_requirements 
WHERE level IN (1, 2, 3);

-- Step 3: Current test user stats
INSERT INTO debug_results (step_order, test_name, result_data)
SELECT 
  3,
  'test_user_current_stats',
  jsonb_build_object(
    'user_id', user_id,
    'current_level', current_level,
    'lifetime_xp', lifetime_xp,
    'current_level_xp', current_level_xp,
    'xp_to_next_level', xp_to_next_level
  )
FROM public.user_level_stats 
WHERE user_id = '7420ed48-4a12-4544-b5b6-05a52293ba22';

-- Step 4: Manual calculation
INSERT INTO debug_results (step_order, test_name, result_data)
VALUES (
  4,
  'manual_calculation',
  jsonb_build_object(
    'total_xp', 1011,
    'level_1_requirement', 651,
    'remaining_xp_after_level_1', 1011 - 651,
    'should_be_level', CASE WHEN 1011 >= 651 THEN 2 ELSE 1 END,
    'explanation', '1011 - 651 = 360, so Level 2 with 360 current XP'
  )
);

-- Step 5: Force update the test user to Level 2
UPDATE public.user_level_stats
SET 
  current_level = 2,
  current_level_xp = 360,
  xp_to_next_level = 291,
  updated_at = now()
WHERE user_id = '7420ed48-4a12-4544-b5b6-05a52293ba22'
  AND current_level = 1;

-- Step 6: Check if the update worked
INSERT INTO debug_results (step_order, test_name, result_data)
SELECT 
  5,
  'test_user_after_update',
  jsonb_build_object(
    'user_id', user_id,
    'current_level', current_level,
    'lifetime_xp', lifetime_xp,
    'current_level_xp', current_level_xp,
    'xp_to_next_level', xp_to_next_level,
    'status', CASE 
      WHEN current_level = 2 THEN 'SUCCESS: Now Level 2!'
      WHEN current_level = 1 THEN 'FAILED: Still Level 1'
      ELSE 'UNKNOWN: Level ' || current_level
    END
  )
FROM public.user_level_stats 
WHERE user_id = '7420ed48-4a12-4544-b5b6-05a52293ba22';

-- Step 7: Check for other users with similar issues
INSERT INTO debug_results (step_order, test_name, result_data)
SELECT 
  6,
  'other_users_with_level_issues',
  jsonb_build_object(
    'count_users_stuck_at_level_1', COUNT(*),
    'users', jsonb_agg(
      jsonb_build_object(
        'user_id', user_id,
        'current_level', current_level,
        'lifetime_xp', lifetime_xp
      )
    )
  )
FROM public.user_level_stats 
WHERE lifetime_xp >= 651 AND current_level = 1;

-- Create a permanent table with the results (you can query this)
DROP TABLE IF EXISTS public.level_debug_results;
CREATE TABLE public.level_debug_results AS 
SELECT * FROM debug_results ORDER BY step_order;

-- Grant access
GRANT SELECT ON public.level_debug_results TO anon, authenticated, service_role;

COMMIT;

-- Now you can query: SELECT * FROM public.level_debug_results ORDER BY step_order;