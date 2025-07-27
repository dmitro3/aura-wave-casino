-- Debug Roulette Bet Insertion
-- This script tests the exact bet insertion that's failing

-- First, let's check if we have any active roulette rounds
SELECT 
    'ACTIVE_ROUNDS' as section,
    id,
    status,
    betting_start_time,
    betting_end_time,
    created_at
FROM public.roulette_rounds
WHERE status = 'betting'
ORDER BY created_at DESC
LIMIT 3;

-- Check if we have any roulette rounds at all
SELECT 
    'ALL_ROUNDS' as section,
    id,
    status,
    betting_start_time,
    betting_end_time,
    created_at
FROM public.roulette_rounds
ORDER BY created_at DESC
LIMIT 5;

-- Check roulette_bets table structure
SELECT 
    'ROULETTE_BETS_STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'roulette_bets'
ORDER BY ordinal_position;

-- Check if we can manually insert a test bet (using a real user ID and round ID)
DO $$
DECLARE
    test_user_id UUID;
    test_round_id UUID;
    test_result RECORD;
BEGIN
    -- Get a real user ID
    SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
    
    -- Get the latest round ID
    SELECT id INTO test_round_id FROM public.roulette_rounds ORDER BY created_at DESC LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found in profiles table';
        RETURN;
    END IF;
    
    IF test_round_id IS NULL THEN
        RAISE NOTICE 'No rounds found in roulette_rounds table';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Testing bet insertion with user_id: % and round_id: %', test_user_id, test_round_id;
    
    -- Try to insert a test bet
    BEGIN
        INSERT INTO public.roulette_bets (
            round_id,
            user_id,
            bet_color,
            bet_amount,
            potential_payout,
            client_seed,
            ip_address,
            user_agent,
            created_at
        ) VALUES (
            test_round_id,
            test_user_id,
            'red',
            1.00,
            2.00,
            'test_client_seed_12345',
            NULL,
            NULL,
            NOW()
        );
        
        RAISE NOTICE 'Test bet insertion SUCCESS!';
        
        -- Clean up the test bet
        DELETE FROM public.roulette_bets 
        WHERE user_id = test_user_id 
        AND bet_amount = 1.00 
        AND client_seed = 'test_client_seed_12345';
        
        RAISE NOTICE 'Test bet cleaned up';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE 'Test bet insertion FAILED: %', SQLERRM;
    END;
END $$;

-- Check if there are any constraints or triggers that might be failing
SELECT 
    'CONSTRAINTS' as section,
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public'
AND table_name = 'roulette_bets'
ORDER BY constraint_name;

-- Check foreign key constraints specifically
SELECT 
    'FOREIGN_KEYS' as section,
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'roulette_bets';

-- Check if the user_id in the error is valid
-- We'll need to replace this with actual user ID from the error
-- SELECT 'USER_CHECK' as section, id, username, balance FROM public.profiles WHERE id = 'REPLACE_WITH_ACTUAL_USER_ID';

-- Show recent bet attempts (if any exist)
SELECT 
    'RECENT_BETS' as section,
    id,
    round_id,
    user_id,
    bet_color,
    bet_amount,
    created_at
FROM public.roulette_bets
ORDER BY created_at DESC
LIMIT 5;