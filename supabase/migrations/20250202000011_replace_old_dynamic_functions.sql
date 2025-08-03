-- Migration: Replace old dynamic XP functions with fixed table lookups
-- This ensures ALL XP calculations use the fixed requirements table

-- Drop the old dynamic XP calculation functions
DROP FUNCTION IF EXISTS public.calculate_xp_for_level(integer) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_level_from_xp(integer) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_total_xp_for_level(integer) CASCADE;

-- Replace calculate_xp_for_level with fixed table lookup
CREATE OR REPLACE FUNCTION public.calculate_xp_for_level(target_level integer)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;
  
  -- Return fixed XP requirement from table, default to max value for levels > 999
  RETURN COALESCE(
    (SELECT xp_required FROM level_xp_requirements WHERE level_xp_requirements.level = target_level),
    42024  -- Default for levels above 999
  );
END;
$function$;

-- Replace calculate_level_from_xp with optimized fixed table lookup
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp integer)
RETURNS TABLE(level integer, current_level_xp integer, xp_to_next integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
DECLARE
  user_level INTEGER := 1;
  xp_consumed INTEGER := 0;
  current_xp INTEGER := 0;
  next_level_xp INTEGER;
BEGIN
  -- Handle edge cases
  IF total_xp <= 0 THEN
    RETURN QUERY SELECT 1, 0::integer, 651;
    RETURN;
  END IF;
  
  -- Use a single query with window functions to find the level efficiently
  SELECT 
    COALESCE(MAX(req_level), 1),
    COALESCE(total_xp::integer - MAX(cumulative_xp), total_xp::integer),
    COALESCE(MAX(cumulative_xp), 0)
  INTO user_level, current_xp, xp_consumed
  FROM (
    SELECT 
      level_xp_requirements.level as req_level,
      SUM(xp_required) OVER (ORDER BY level_xp_requirements.level ROWS UNBOUNDED PRECEDING) as cumulative_xp
    FROM level_xp_requirements 
    WHERE level_xp_requirements.level <= 999
  ) cumulative
  WHERE cumulative_xp <= total_xp;
  
  -- If we found no levels (total_xp is less than first level requirement)
  -- then user is still at level 1
  IF user_level IS NULL THEN
    user_level := 1;
    current_xp := total_xp::integer;
    xp_consumed := 0;
  END IF;
  
  -- Cap at level 999
  IF user_level >= 999 THEN
    user_level := 999;
    next_level_xp := 0;  -- Max level reached
  ELSE
    -- Get XP requirement for next level
    SELECT xp_required INTO next_level_xp 
    FROM level_xp_requirements 
    WHERE level_xp_requirements.level = user_level + 1;
    
    -- Calculate remaining XP needed for next level
    next_level_xp := COALESCE(next_level_xp, 0) - current_xp;
  END IF;
  
  RETURN QUERY SELECT 
    user_level,
    current_xp,
    COALESCE(next_level_xp, 0);
END;
$function$;

-- Replace calculate_total_xp_for_level with fixed table lookup
CREATE OR REPLACE FUNCTION public.calculate_total_xp_for_level(target_level integer)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $function$
BEGIN
  IF target_level <= 1 THEN
    RETURN 0;
  END IF;
  
  -- Calculate cumulative XP needed to reach target level
  RETURN COALESCE(
    (SELECT SUM(xp_required) FROM level_xp_requirements WHERE level_xp_requirements.level < target_level),
    0
  );
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.calculate_xp_for_level(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_level_from_xp(integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calculate_total_xp_for_level(integer) TO anon, authenticated, service_role;

-- Update any user level stats that might be using wrong calculations
UPDATE user_level_stats SET 
  current_level = (SELECT level FROM calculate_level_from_xp(lifetime_xp::integer)),
  current_level_xp = (SELECT current_level_xp FROM calculate_level_from_xp(lifetime_xp::integer)),
  xp_to_next_level = (SELECT xp_to_next FROM calculate_level_from_xp(lifetime_xp::integer))
WHERE lifetime_xp IS NOT NULL;

-- Test the functions to ensure they work correctly
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test old function name with fixed values
  SELECT * INTO test_result FROM calculate_level_from_xp(651);
  RAISE NOTICE 'OLD function calculate_level_from_xp(651): level=%, current_level_xp=%, xp_to_next=%', 
    test_result.level, test_result.current_level_xp, test_result.xp_to_next;
  
  -- Test XP requirement lookup
  RAISE NOTICE 'XP required for level 2: %', calculate_xp_for_level(2);
  RAISE NOTICE 'XP required for level 11: %', calculate_xp_for_level(11);
  
  RAISE NOTICE '✅ All old dynamic functions replaced with fixed table lookups';
  RAISE NOTICE '🎯 XP requirements are now permanently fixed - no more dynamic calculations!';
END $$;