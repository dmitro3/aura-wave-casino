-- 🔧 FIX CALCULATE LEVEL FUNCTION
-- Fix the bug in calculate_level_from_xp that returns wrong level

BEGIN;

-- Fix the calculate_level_from_xp function
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp integer)
RETURNS TABLE(user_level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  v_user_level INTEGER := 1;
  v_current_xp INTEGER := 0;
  v_next_level_xp INTEGER := 651;  -- Default for level 1->2
  v_remaining_xp INTEGER;
  level_record RECORD;
BEGIN
  -- Handle edge cases
  IF total_xp <= 0 THEN
    RETURN QUERY SELECT 1, 0::integer, 651;
    RETURN;
  END IF;
  
  -- Calculate level by going through cumulative XP requirements
  v_remaining_xp := total_xp;
  
  -- Loop through levels with proper table aliases
  FOR level_record IN 
    SELECT req.level as req_level, req.xp_required as req_xp
    FROM public.level_xp_requirements req 
    ORDER BY req.level ASC
  LOOP
    -- If we have enough XP to complete this level
    IF v_remaining_xp >= level_record.req_xp THEN
      v_remaining_xp := v_remaining_xp - level_record.req_xp;
      -- 🔧 FIX: When we complete a level, advance to the NEXT level
      v_user_level := level_record.req_level + 1;  -- FIXED: was level_record.req_level
      v_current_xp := 0;  -- We completed this level, start fresh for next
    ELSE
      -- We're currently in this level (incomplete)
      v_current_xp := v_remaining_xp;
      v_next_level_xp := level_record.req_xp - v_remaining_xp;
      EXIT;  -- Stop here, we found our current level
    END IF;
  END LOOP;
  
  -- If we've gone through all levels, we're at max level
  IF v_user_level >= 999 THEN
    v_user_level := 999;
    v_current_xp := v_remaining_xp;
    v_next_level_xp := 0;  -- No more levels
  ELSE
    -- Get XP requirement for next level if we haven't set it yet
    -- Use explicit table alias to avoid ambiguity
    IF v_next_level_xp IS NULL OR v_next_level_xp = 651 THEN
      SELECT req.xp_required INTO v_next_level_xp 
      FROM public.level_xp_requirements req
      WHERE req.level = v_user_level;  -- Current level requirement (for remaining XP)
      v_next_level_xp := COALESCE(v_next_level_xp, 0) - v_current_xp;
    END IF;
  END IF;
  
  RETURN QUERY SELECT 
    v_user_level,
    v_current_xp,
    GREATEST(0, v_next_level_xp);
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp(integer) TO anon, authenticated, service_role;

-- Test the fixed function
CREATE TEMP TABLE test_results AS
SELECT 
  'Fixed function test with 1011 XP:' as test,
  user_level as calculated_level,
  current_level_xp as calculated_current_xp,
  xp_to_next as calculated_xp_to_next
FROM public.calculate_level_from_xp(1011);

-- Test with a few other values
INSERT INTO test_results
SELECT 
  'Test with 650 XP (should be Level 1):' as test,
  user_level,
  current_level_xp,
  xp_to_next
FROM public.calculate_level_from_xp(650);

INSERT INTO test_results
SELECT 
  'Test with 651 XP (should be Level 2):' as test,
  user_level,
  current_level_xp,
  xp_to_next
FROM public.calculate_level_from_xp(651);

INSERT INTO test_results
SELECT 
  'Test with 1302 XP (should be Level 3):' as test,
  user_level,
  current_level_xp,
  xp_to_next
FROM public.calculate_level_from_xp(1302);

-- Create permanent test results table
DROP TABLE IF EXISTS public.level_function_test_results;
CREATE TABLE public.level_function_test_results AS 
SELECT * FROM test_results;

GRANT SELECT ON public.level_function_test_results TO anon, authenticated, service_role;

-- Now run recalculation for all users to fix their levels
UPDATE public.user_level_stats
SET 
  current_level = (SELECT user_level FROM public.calculate_level_from_xp(ROUND(lifetime_xp, 3)::integer)),
  current_level_xp = (SELECT current_level_xp FROM public.calculate_level_from_xp(ROUND(lifetime_xp, 3)::integer)),
  xp_to_next_level = (SELECT xp_to_next FROM public.calculate_level_from_xp(ROUND(lifetime_xp, 3)::integer)),
  updated_at = now()
WHERE lifetime_xp IS NOT NULL AND lifetime_xp > 0;

COMMIT;

-- Query to run: SELECT * FROM level_function_test_results;