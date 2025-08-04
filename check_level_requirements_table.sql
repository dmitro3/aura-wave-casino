-- 🔍 CHECK CURRENT LEVEL REQUIREMENTS TABLE
-- See what XP requirements are currently in the table

-- Check total count and sample data
SELECT 'TOTAL LEVELS' as info, COUNT(*) as count FROM public.level_xp_requirements
UNION ALL
SELECT 'FIRST 10 LEVELS', '' FROM (SELECT 1 LIMIT 1) x

UNION ALL
SELECT CONCAT('Level ', level, ' needs ', xp_required, ' XP'), '' as count
FROM public.level_xp_requirements 
WHERE level <= 10
ORDER BY level

UNION ALL
SELECT 'LEVEL RANGES', '' FROM (SELECT 1 LIMIT 1) x

UNION ALL
SELECT CONCAT('Level ', level, ' needs ', xp_required, ' XP'), '' as count
FROM public.level_xp_requirements 
WHERE level IN (11, 21, 31, 41, 51, 100, 200, 500, 999)
ORDER BY level;