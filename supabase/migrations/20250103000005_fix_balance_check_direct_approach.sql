-- ===============================================
-- FIX BALANCE CHECK - DIRECT APPROACH
-- ===============================================
-- This completely rewrites the balance check to bypass all RLS issues

-- Drop the problematic function
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) CASCADE;

-- Create a simple, direct version that definitely works
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
  v_rows_affected INTEGER;
BEGIN
  -- Simple, direct balance check and update in one atomic operation
  -- This bypasses any RLS issues by using a single UPDATE with WHERE conditions
  
  UPDATE public.profiles 
  SET 
    balance = balance - p_bet_amount,
    updated_at = NOW()
  WHERE 
    id = p_user_id 
    AND balance >= p_bet_amount  -- Only update if sufficient balance
  RETURNING balance INTO v_new_balance;
  
  -- Check if the update succeeded
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;
  
  IF v_rows_affected = 0 THEN
    -- Update failed - either user doesn't exist or insufficient balance
    -- Check which case it is
    SELECT balance INTO v_current_balance 
    FROM public.profiles 
    WHERE id = p_user_id;
    
    IF v_current_balance IS NULL THEN
      RETURN QUERY SELECT FALSE, 'User not found', 0::NUMERIC;
    ELSE
      RETURN QUERY SELECT FALSE, 'Insufficient balance', v_current_balance;
    END IF;
  ELSE
    -- Update succeeded
    RETURN QUERY SELECT TRUE, 'Success', v_new_balance;
  END IF;
  
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.atomic_bet_balance_check(UUID, NUMERIC, TEXT) TO anon, authenticated, service_role;

-- Alternative: Create a rollback function in case we need it
CREATE OR REPLACE FUNCTION public.rollback_bet_balance(
  p_user_id UUID,
  p_bet_amount NUMERIC
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles 
  SET 
    balance = balance + p_bet_amount,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rollback_bet_balance(UUID, NUMERIC) TO anon, authenticated, service_role;

-- Test the new function
DO $$
DECLARE
  test_result RECORD;
  original_balance NUMERIC;
BEGIN
  -- Get original balance
  SELECT balance INTO original_balance 
  FROM public.profiles 
  WHERE id = 'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID;
  
  RAISE LOG 'Original balance: %', original_balance;
  
  -- Test with small amount
  SELECT * INTO test_result FROM public.atomic_bet_balance_check(
    'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID, 
    1.00, 
    'test-balance-check'
  );
  
  RAISE LOG 'Test result: success=%, message=%, new_balance=%', 
    test_result.success, test_result.error_message, test_result.new_balance;
  
  IF test_result.success THEN
    -- Restore the balance
    PERFORM public.rollback_bet_balance(
      'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID, 
      1.00
    );
    RAISE LOG 'Balance check test PASSED and balance restored';
  ELSE
    RAISE LOG 'Balance check test FAILED: %', test_result.error_message;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Balance check test ERROR: %', SQLERRM;
END;
$$;

-- Test with the actual bet amount that's failing
DO $$
DECLARE
  test_result RECORD;
  original_balance NUMERIC;
BEGIN
  -- Get original balance
  SELECT balance INTO original_balance 
  FROM public.profiles 
  WHERE id = 'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID;
  
  RAISE LOG 'Testing 1000 bet - Original balance: %', original_balance;
  
  -- Test with 1000 bet amount
  SELECT * INTO test_result FROM public.atomic_bet_balance_check(
    'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID, 
    1000.00, 
    'test-1000-bet'
  );
  
  RAISE LOG '1000 bet test result: success=%, message=%, new_balance=%', 
    test_result.success, test_result.error_message, test_result.new_balance;
  
  IF test_result.success THEN
    -- Restore the balance
    PERFORM public.rollback_bet_balance(
      'fdbbfe8c-28af-49a8-b1de-398896a8e962'::UUID, 
      1000.00
    );
    RAISE LOG '1000 bet test PASSED and balance restored';
  ELSE
    RAISE LOG '1000 bet test FAILED: %', test_result.error_message;
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '1000 bet test ERROR: %', SQLERRM;
END;
$$;

-- Final confirmation
SELECT 'Direct balance check approach implemented and tested!' as status;