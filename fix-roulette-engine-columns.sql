-- Fix Roulette Engine Column Issues
-- Ensure the roulette_bets table matches exactly what the engine expects

-- First, let's see the current structure
SELECT 
    'CURRENT_STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'roulette_bets'
ORDER BY ordinal_position;

-- Check for any foreign key constraint to auth.users that might be causing issues
DO $$
DECLARE
    constraint_exists BOOLEAN := FALSE;
BEGIN
    -- Check if there's a foreign key to auth.users
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'roulette_bets'
        AND kcu.column_name = 'user_id'
        AND ccu.table_name = 'users'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE '❌ Found foreign key constraint to auth.users - this might be the issue!';
        
        -- Drop the problematic foreign key constraint
        BEGIN
            ALTER TABLE public.roulette_bets DROP CONSTRAINT IF EXISTS roulette_bets_user_id_fkey;
            RAISE NOTICE '✅ Dropped foreign key constraint to auth.users';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '⚠️ Could not drop constraint: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE '✅ No foreign key constraint to auth.users found';
    END IF;
END $$;

-- Ensure all required columns exist with correct types
DO $$
BEGIN
    -- Add ip_address column if it doesn't exist
    BEGIN
        ALTER TABLE public.roulette_bets ADD COLUMN IF NOT EXISTS ip_address TEXT;
        RAISE NOTICE '✅ ip_address column ensured';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ ip_address column issue: %', SQLERRM;
    END;
    
    -- Add user_agent column if it doesn't exist
    BEGIN
        ALTER TABLE public.roulette_bets ADD COLUMN IF NOT EXISTS user_agent TEXT;
        RAISE NOTICE '✅ user_agent column ensured';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ user_agent column issue: %', SQLERRM;
    END;
    
    -- Ensure created_at allows manual insertion (remove default constraint if problematic)
    BEGIN
        ALTER TABLE public.roulette_bets ALTER COLUMN created_at DROP DEFAULT;
        ALTER TABLE public.roulette_bets ALTER COLUMN created_at SET DEFAULT now();
        RAISE NOTICE '✅ created_at column default fixed';
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '⚠️ created_at column issue: %', SQLERRM;
    END;
END $$;

-- Test the exact insert that the roulette engine does
DO $$
DECLARE
    test_user_id UUID;
    test_round_id UUID;
    test_result RECORD;
BEGIN
    -- Get a real user and round
    SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
    SELECT id INTO test_round_id FROM public.roulette_rounds ORDER BY created_at DESC LIMIT 1;
    
    IF test_user_id IS NULL OR test_round_id IS NULL THEN
        RAISE NOTICE '❌ Missing test data (user or round)';
        RETURN;
    END IF;
    
    -- Test the EXACT insert statement from roulette engine
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
            'test_client_seed',
            NULL,
            NULL,
            NOW()
        ) RETURNING id INTO test_result;
        
        RAISE NOTICE '✅ EXACT roulette engine insert test SUCCESS! ID: %', test_result.id;
        
        -- Clean up
        DELETE FROM public.roulette_bets WHERE id = test_result.id;
        RAISE NOTICE '✅ Test cleaned up';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ EXACT roulette engine insert FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    END;
END $$;

-- Show final structure
SELECT 
    'FINAL_STRUCTURE' as section,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'roulette_bets'
ORDER BY ordinal_position;