-- Simplified Roulette Bet Test
-- This mimics exactly what the roulette engine is doing

DO $$
DECLARE
    test_user_id UUID;
    test_round_id UUID;
    test_balance NUMERIC;
    bet_amount NUMERIC := 1.00;
    bet_color TEXT := 'red';
    potential_payout NUMERIC := 2.00;
    client_seed TEXT := 'test_seed_123';
    balance_check_result JSONB;
    bet_result RECORD;
BEGIN
    -- Get a real user ID
    SELECT id, balance INTO test_user_id, test_balance FROM public.profiles LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE '❌ No users found in profiles table';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found user: % with balance: %', test_user_id, test_balance;
    
    -- Get the latest round
    SELECT id INTO test_round_id FROM public.roulette_rounds ORDER BY created_at DESC LIMIT 1;
    
    IF test_round_id IS NULL THEN
        RAISE NOTICE '❌ No rounds found - creating a test round';
        
        -- Create a test round
        INSERT INTO public.roulette_rounds (
            status,
            betting_start_time,
            betting_end_time
        ) VALUES (
            'betting',
            NOW(),
            NOW() + INTERVAL '30 seconds'
        ) RETURNING id INTO test_round_id;
        
        RAISE NOTICE '✅ Created test round: %', test_round_id;
    ELSE
        RAISE NOTICE '✅ Found round: %', test_round_id;
    END IF;
    
    -- Step 1: Test atomic balance check (like the roulette engine does)
    RAISE NOTICE '🔍 Testing atomic balance check...';
    
    BEGIN
        SELECT public.atomic_bet_balance_check(test_user_id, bet_amount, test_round_id) INTO balance_check_result;
        RAISE NOTICE '✅ Balance check result: %', balance_check_result;
        
        IF (balance_check_result->>'success')::BOOLEAN = FALSE THEN
            RAISE NOTICE '❌ Balance check failed: %', balance_check_result->>'error_message';
            RETURN;
        END IF;
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Balance check function failed: %', SQLERRM;
            RETURN;
    END;
    
    -- Step 2: Test bet insertion (exactly like the roulette engine)
    RAISE NOTICE '🔍 Testing bet insertion with exact roulette engine parameters...';
    
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
            bet_color,
            bet_amount,
            potential_payout,
            client_seed,
            NULL,
            NULL,
            NOW()
        ) RETURNING * INTO bet_result;
        
        RAISE NOTICE '✅ Bet insertion SUCCESS! Bet ID: %', bet_result.id;
        
        -- Clean up
        DELETE FROM public.roulette_bets WHERE id = bet_result.id;
        RAISE NOTICE '✅ Test bet cleaned up';
        
        -- Restore balance
        PERFORM public.rollback_bet_balance(test_user_id, bet_amount);
        RAISE NOTICE '✅ Balance restored';
        
    EXCEPTION
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Bet insertion FAILED: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
            
            -- Try to restore balance
            BEGIN
                PERFORM public.rollback_bet_balance(test_user_id, bet_amount);
                RAISE NOTICE '✅ Balance restored after failure';
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE NOTICE '❌ Failed to restore balance: %', SQLERRM;
            END;
    END;
    
    -- Step 3: Check what specific constraint might be failing
    RAISE NOTICE '🔍 Checking potential issues...';
    
    -- Check if user_id exists in auth.users (foreign key requirement)
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_id) THEN
        RAISE NOTICE '✅ User exists in auth.users';
    ELSE
        RAISE NOTICE '❌ User does NOT exist in auth.users - this could be the issue!';
    END IF;
    
    -- Check if round exists
    IF EXISTS (SELECT 1 FROM public.roulette_rounds WHERE id = test_round_id) THEN
        RAISE NOTICE '✅ Round exists in roulette_rounds';
    ELSE
        RAISE NOTICE '❌ Round does NOT exist in roulette_rounds';
    END IF;
    
END $$;