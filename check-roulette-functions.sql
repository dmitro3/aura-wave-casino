-- Check Roulette Functions and Policies
-- This script diagnoses the current state of roulette betting system

-- 1. Check if atomic_bet_balance_check function exists
SELECT 
    'FUNCTION_CHECK' as section,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('atomic_bet_balance_check', 'rollback_bet_balance')
ORDER BY routine_name;

-- 2. Check current RLS policies on roulette tables
SELECT 
    'RLS_POLICIES' as section,
    tablename,
    policyname,
    cmd,
    roles::text as roles,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('roulette_bets', 'roulette_rounds', 'roulette_client_seeds', 'roulette_results')
ORDER BY tablename, policyname;

-- 3. Check table permissions for service_role
SELECT 
    'PERMISSIONS' as section,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges
WHERE table_schema = 'public'
AND table_name IN ('roulette_bets', 'roulette_rounds', 'roulette_client_seeds', 'roulette_results')
AND grantee = 'service_role'
ORDER BY table_name, privilege_type;

-- 4. Check if roulette tables exist and their structure
SELECT 
    'TABLE_STRUCTURE' as section,
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'roulette_bets'
ORDER BY ordinal_position;

-- 5. Test if we can create a simple function (to check permissions)
DO $$
BEGIN
    -- Try to create a test function
    CREATE OR REPLACE FUNCTION test_service_role_access()
    RETURNS TEXT
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $func$
    BEGIN
        RETURN 'Service role access working';
    END;
    $func$;
    
    RAISE NOTICE 'Test function created successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to create test function: %', SQLERRM;
END $$;

-- 6. Check current round status
SELECT 
    'CURRENT_ROUND' as section,
    id,
    status,
    betting_start_time,
    betting_end_time,
    created_at
FROM public.roulette_rounds
ORDER BY created_at DESC
LIMIT 1;