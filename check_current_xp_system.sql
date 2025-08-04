-- 🔍 CHECK CURRENT XP SYSTEM
-- Examine the existing level/XP system configuration

-- 1. Check level_xp_requirements table
SELECT 'LEVEL XP REQUIREMENTS' as check_type, COUNT(*) as row_count FROM public.level_xp_requirements
UNION ALL
SELECT 'SAMPLE XP REQUIREMENTS', CONCAT('Level ', level, ': ', xp_required, ' XP') as data
FROM public.level_xp_requirements 
WHERE level IN (1, 2, 10, 11, 20, 21, 50, 100) 
ORDER BY level

UNION ALL

-- 2. Check current update_user_stats_and_level function XP calculation
SELECT 'CURRENT FUNCTION', 'update_user_stats_and_level exists: ' || 
  CASE WHEN EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_schema = 'public' 
    AND routine_name = 'update_user_stats_and_level'
  ) THEN 'YES' ELSE 'NO' END

UNION ALL

-- 3. Test current level calculation
SELECT 'LEVEL CALC TEST', CONCAT('1000 XP = Level ', level, ', Current: ', current_level_xp, ', To Next: ', xp_to_next)
FROM public.calculate_level_from_xp(1000)

UNION ALL

SELECT 'LEVEL CALC TEST', CONCAT('5000 XP = Level ', level, ', Current: ', current_level_xp, ', To Next: ', xp_to_next)
FROM public.calculate_level_from_xp(5000);