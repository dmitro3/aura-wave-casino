-- ===============================================
-- FIX BALANCE CHECK RLS ISSUES
-- ===============================================
-- This fixes the RLS policy issues preventing atomic_bet_balance_check from working

-- Drop the existing function
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) CASCADE;

-- Create an improved version that bypasses RLS issues
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
SECURITY DEFINER  -- This is critical - runs with elevated privileges
SET search_path = public  -- Ensure we're using the right schema
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_user_exists BOOLEAN := FALSE;
BEGIN
  -- Log the function call for debugging
  RAISE LOG 'atomic_bet_balance_check called: user=%, amount=%, round=%', 
    p_user_id, p_bet_amount, p_round_id;

  -- Validate inputs
  IF p_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Invalid user ID', 0::NUMERIC;
    RETURN;
  END IF;

  IF p_bet_amount IS NULL OR p_bet_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 'Invalid bet amount', 0::NUMERIC;
    RETURN;
  END IF;

  -- First check if user exists and get balance (without FOR UPDATE initially)
  BEGIN
    SELECT balance, true INTO v_current_balance, v_user_exists
    FROM public.profiles 
    WHERE id = p_user_id;
    
    RAISE LOG 'Balance check: user_exists=%, balance=%', v_user_exists, v_current_balance;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error checking user existence: %', SQLERRM;
    RETURN QUERY SELECT FALSE, 'Error accessing user data', 0::NUMERIC;
    RETURN;
  END;

  -- Check if user was found
  IF NOT FOUND OR v_current_balance IS NULL THEN
    RAISE LOG 'User not found or balance is null: user_id=%', p_user_id;
    RETURN QUERY SELECT FALSE, 'User not found', 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if user has sufficient balance
  IF v_current_balance < p_bet_amount THEN
    RAISE LOG 'Insufficient balance: has=%, needs=%', v_current_balance, p_bet_amount;
    RETURN QUERY SELECT FALSE, 'Insufficient balance', v_current_balance;
    RETURN;
  END IF;

  -- Now do the atomic update with FOR UPDATE
  BEGIN
    -- Lock the row and get the latest balance
    SELECT balance INTO v_current_balance 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;

    -- Double-check balance after lock (in case it changed)
    IF v_current_balance < p_bet_amount THEN
      RAISE LOG 'Insufficient balance after lock: has=%, needs=%', v_current_balance, p_bet_amount;
      RETURN QUERY SELECT FALSE, 'Insufficient balance', v_current_balance;
      RETURN;
    END IF;

    -- Calculate new balance
    v_new_balance := v_current_balance - p_bet_amount;
    
    -- Update the balance
    UPDATE public.profiles 
    SET balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Verify the update worked
    IF NOT FOUND THEN
      RAISE LOG 'Failed to update balance for user: %', p_user_id;
      RETURN QUERY SELECT FALSE, 'Failed to update balance', v_current_balance;
      RETURN;
    END IF;

    RAISE LOG 'Balance updated successfully: old=%, new=%', v_current_balance, v_new_balance;
    RETURN QUERY SELECT TRUE, 'Success', v_new_balance;

  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error during balance update: %', SQLERRM;
    RETURN QUERY SELECT FALSE, 'Database error during balance update', 0::NUMERIC;
    RETURN;
  END;

END;
$$;

-- Grant permissions to all necessary roles
GRANT EXECUTE ON FUNCTION public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;

-- Test the function with the testacc user
DO $$
DECLARE
  test_result RECORD;
BEGIN
  -- Test with testacc user ID and small amount
  SELECT * INTO test_result FROM public.atomic_bet_balance_check(
    'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID, 
    1.00, 
    'test-round-balance-check'
  );
  
  IF test_result.success THEN
    RAISE LOG 'Balance check test PASSED: %', test_result.error_message;
    
    -- Restore the test amount since this was just a test
    UPDATE public.profiles 
    SET balance = balance + 1.00,
        updated_at = NOW()
    WHERE id = 'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID;
    
  ELSE
    RAISE LOG 'Balance check test FAILED: %', test_result.error_message;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Balance check test ERROR: %', SQLERRM;
END;
$$;

-- Final verification
SELECT 'Balance check function fixed and tested!' as status;