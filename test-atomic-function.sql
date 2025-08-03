-- Test script to verify atomic_bet_balance_check function is working
-- Run this in Supabase SQL Editor to test the function

-- 1. First, check if the function exists with correct signature
SELECT 
    routine_name,
    routine_type,
    data_type as return_type,
    specific_name
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'atomic_bet_balance_check'
ORDER BY specific_name;

-- 2. Check function parameters
SELECT 
    p.parameter_name,
    p.data_type,
    p.ordinal_position
FROM information_schema.parameters p
WHERE p.specific_schema = 'public'
AND p.specific_name IN (
    SELECT specific_name 
    FROM information_schema.routines 
    WHERE routine_name = 'atomic_bet_balance_check'
)
ORDER BY p.ordinal_position;

-- 3. Test function call with dummy data (this will fail but show if function signature works)
-- Replace these UUIDs with real ones from your database if you want to test properly
-- SELECT public.atomic_bet_balance_check(
--     'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'::UUID,  -- p_user_id
--     1.00::NUMERIC,                                    -- p_bet_amount  
--     'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj'::UUID   -- p_round_id
-- );

-- 4. Show any recent bet records to see if balance deductions are working
SELECT 
    rb.id,
    rb.user_id,
    rb.bet_amount,
    rb.created_at,
    p.balance as current_balance
FROM roulette_bets rb
JOIN profiles p ON p.id = rb.user_id
ORDER BY rb.created_at DESC
LIMIT 5;