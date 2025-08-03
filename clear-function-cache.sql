-- Commands to clear function cache and refresh schema in Supabase
-- Run these in SQL Editor if you're getting "schema cache" errors

-- 1. Reload PostgreSQL configuration (clears various caches)
SELECT pg_reload_conf();

-- 2. Clear query plan cache
SELECT pg_stat_reset();

-- 3. Refresh function definitions in current session
DISCARD ALL;

-- 4. Force recreation of function if needed (run only if above doesn't work)
-- DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(UUID, NUMERIC, UUID) CASCADE;
-- Then re-run the migration: 20250129000006-fix-atomic-bet-balance-check.sql

-- 5. Check if function exists after cache clear
SELECT routine_name, data_type, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'atomic_bet_balance_check' 
AND routine_schema = 'public';

-- 6. Verify Edge Functions can see the function
-- (This is just informational - you can't directly test Edge Function access from SQL)
SELECT 
    'Function should now be available to Edge Functions' as status,
    COUNT(*) as function_count
FROM information_schema.routines 
WHERE routine_name = 'atomic_bet_balance_check' 
AND routine_schema = 'public';