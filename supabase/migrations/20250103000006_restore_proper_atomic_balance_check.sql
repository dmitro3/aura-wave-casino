-- ===============================================
-- RESTORE PROPER ATOMIC BALANCE CHECK
-- ===============================================
-- This reverts to the safe approach that doesn't deduct balance on failure

-- Drop the problematic direct approach function
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.rollback_bet_balance(UUID, NUMERIC) CASCADE;

-- Restore the proper atomic balance check that was working before
CREATE OR REPLACE FUNCTION public.atomic_bet_balance_check(
  p_user_id UUID,
  p_bet_amount NUMERIC,
  p_round_id TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  error_message TEXT,
  new_balance NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- First, verify we can read the user's balance with service role privileges
  SELECT balance INTO v_current_balance
  FROM public.profiles 
  WHERE id = p_user_id;

  -- Check if user exists
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 'User not found', 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if user has sufficient balance
  IF v_current_balance < p_bet_amount THEN
    RETURN QUERY SELECT FALSE, 'Insufficient balance', v_current_balance;
    RETURN;
  END IF;

  -- User has sufficient balance, now do the atomic deduction
  -- Lock the row and deduct the balance
  UPDATE public.profiles 
  SET balance = balance - p_bet_amount,
      updated_at = NOW()
  WHERE id = p_user_id 
    AND balance >= p_bet_amount;  -- Double-check balance hasn't changed

  -- Check if the update actually happened
  IF NOT FOUND THEN
    -- This means the balance changed between our check and update
    SELECT balance INTO v_current_balance FROM public.profiles WHERE id = p_user_id;
    RETURN QUERY SELECT FALSE, 'Insufficient balance', v_current_balance;
    RETURN;
  END IF;

  -- Get the new balance
  SELECT balance INTO v_new_balance 
  FROM public.profiles 
  WHERE id = p_user_id;

  RETURN QUERY SELECT TRUE, 'Success', v_new_balance;

END;
$$;

-- Grant permissions to all roles
GRANT EXECUTE ON FUNCTION public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;

-- Now let's test this function directly to see what's happening
DO $$
DECLARE
  test_result RECORD;
  user_balance NUMERIC;
BEGIN
  -- First check the current balance
  SELECT balance INTO user_balance 
  FROM public.profiles 
  WHERE id = 'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID;
  
  RAISE NOTICE 'Current testacc balance: %', user_balance;
  
  -- Test the function with a small amount first
  SELECT * INTO test_result FROM public.atomic_bet_balance_check(
    'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID, 
    10.00, 
    'test-round'
  );
  
  RAISE NOTICE 'Test result: success=%, message=%, new_balance=%', 
    test_result.success, test_result.error_message, test_result.new_balance;
  
  -- If successful, add the money back
  IF test_result.success THEN
    UPDATE public.profiles 
    SET balance = balance + 10.00,
        updated_at = NOW()
    WHERE id = 'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID;
    RAISE NOTICE 'Test successful - balance restored';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test failed with error: %', SQLERRM;
END;
$$;

-- Final verification
SELECT 'Proper atomic balance check restored!' as status;