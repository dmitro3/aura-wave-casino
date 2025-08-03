-- Fix atomic_bet_balance_check function to match roulette backend expectations
-- The roulette backend calls this with 3 parameters: p_user_id, p_bet_amount, p_round_id

-- Drop ALL existing versions of the function
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(uuid, numeric);
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(uuid, numeric, uuid);
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(UUID, NUMERIC, UUID);

-- Create the 3-parameter version that roulette backend expects
CREATE OR REPLACE FUNCTION public.atomic_bet_balance_check(
  p_user_id UUID, 
  p_bet_amount NUMERIC, 
  p_round_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_balance NUMERIC;
    round_status TEXT;
    betting_end_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Check if round exists and is in betting phase
    SELECT status, betting_end_time INTO round_status, betting_end_time 
    FROM public.roulette_rounds 
    WHERE id = p_round_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_message', 'Round not found');
    END IF;
    
    IF round_status != 'betting' THEN
        RETURN json_build_object('success', false, 'error_message', 'Betting is not active for this round');
    END IF;
    
    IF NOW() > betting_end_time THEN
        RETURN json_build_object('success', false, 'error_message', 'Betting time has expired');
    END IF;

    -- Get current balance with FOR UPDATE lock to prevent race conditions
    SELECT balance INTO user_balance 
    FROM public.profiles 
    WHERE id = p_user_id 
    FOR UPDATE;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error_message', 'User not found');
    END IF;
    
    -- Check if user has sufficient balance
    IF user_balance < p_bet_amount THEN
        RETURN json_build_object('success', false, 'error_message', 'Insufficient balance');
    END IF;
    
    -- Deduct bet amount from balance
    UPDATE public.profiles 
    SET balance = balance - p_bet_amount, updated_at = NOW() 
    WHERE id = p_user_id;
    
    -- Return success with updated balance
    RETURN json_build_object(
        'success', true, 
        'new_balance', user_balance - p_bet_amount,
        'deducted_amount', p_bet_amount
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.atomic_bet_balance_check(UUID, NUMERIC, UUID) TO anon, authenticated, service_role;