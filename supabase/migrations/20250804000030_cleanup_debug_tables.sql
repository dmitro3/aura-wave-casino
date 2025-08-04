-- 🧹 CLEANUP DEBUG TABLES
-- Remove temporary debug and test tables that are no longer needed

BEGIN;

-- Drop the debug results table
DROP TABLE IF EXISTS public.level_debug_results;

-- Drop the function test results table  
DROP TABLE IF EXISTS public.level_function_test_results;

-- Drop the recalculate_user_levels function (was only for debugging)
DROP FUNCTION IF EXISTS public.recalculate_user_levels();

COMMIT;