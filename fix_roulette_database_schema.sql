-- Fix Roulette Database Schema Issues
-- This script addresses missing columns and functions for the roulette system

-- Add missing columns to tables
DO $$ 
BEGIN
    -- Add result_multiplier to roulette_results if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roulette_results' 
        AND column_name = 'result_multiplier'
    ) THEN
        ALTER TABLE public.roulette_results ADD COLUMN result_multiplier NUMERIC DEFAULT 2;
        RAISE NOTICE 'Added result_multiplier column to roulette_results';
    END IF;

    -- Add other potentially missing columns to roulette_results
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roulette_results' 
        AND column_name = 'result_slot'
    ) THEN
        ALTER TABLE public.roulette_results ADD COLUMN result_slot INTEGER;
        RAISE NOTICE 'Added result_slot column to roulette_results';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roulette_results' 
        AND column_name = 'result_color'
    ) THEN
        ALTER TABLE public.roulette_results ADD COLUMN result_color TEXT;
        RAISE NOTICE 'Added result_color column to roulette_results';
    END IF;

    -- Add missing columns to roulette_rounds if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roulette_rounds' 
        AND column_name = 'result_slot'
    ) THEN
        ALTER TABLE public.roulette_rounds ADD COLUMN result_slot INTEGER;
        RAISE NOTICE 'Added result_slot column to roulette_rounds';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roulette_rounds' 
        AND column_name = 'result_color'
    ) THEN
        ALTER TABLE public.roulette_rounds ADD COLUMN result_color TEXT;
        RAISE NOTICE 'Added result_color column to roulette_rounds';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'roulette_rounds' 
        AND column_name = 'result_multiplier'
    ) THEN
        ALTER TABLE public.roulette_rounds ADD COLUMN result_multiplier NUMERIC DEFAULT 2;
        RAISE NOTICE 'Added result_multiplier column to roulette_rounds';
    END IF;
END $$;

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.place_roulette_bet(uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS public.complete_roulette_round(uuid, integer, text, numeric);
DROP FUNCTION IF EXISTS public.get_or_create_daily_seed(date);
DROP FUNCTION IF EXISTS public.reveal_daily_seed(date);
DROP FUNCTION IF EXISTS public.atomic_bet_balance_check(uuid, numeric);
DROP FUNCTION IF EXISTS public.rollback_bet_balance(uuid, numeric);

-- Create place_roulette_bet function
CREATE OR REPLACE FUNCTION public.place_roulette_bet(
    p_user_id uuid,
    p_round_id uuid,
    p_bet_color text,
    p_bet_amount numeric
) RETURNS TABLE(
    bet_id uuid,
    success boolean,
    message text,
    user_balance numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_user_balance numeric;
    v_new_bet_id uuid;
    v_round_status text;
BEGIN
    -- Check if round exists and is in betting phase
    SELECT status INTO v_round_status
    FROM roulette_rounds
    WHERE id = p_round_id;

    IF v_round_status IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Round not found', 0::numeric;
        RETURN;
    END IF;

    IF v_round_status != 'betting' THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Betting is closed for this round', 0::numeric;
        RETURN;
    END IF;

    -- Check user balance
    SELECT balance INTO v_user_balance
    FROM profiles
    WHERE id = p_user_id;

    IF v_user_balance IS NULL THEN
        RETURN QUERY SELECT NULL::uuid, false, 'User not found', 0::numeric;
        RETURN;
    END IF;

    IF v_user_balance < p_bet_amount THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Insufficient balance', v_user_balance;
        RETURN;
    END IF;

    -- Deduct balance and create bet
    UPDATE profiles 
    SET balance = balance - p_bet_amount
    WHERE id = p_user_id
    RETURNING balance INTO v_user_balance;

    -- Insert bet
    INSERT INTO roulette_bets (user_id, round_id, bet_color, bet_amount)
    VALUES (p_user_id, p_round_id, p_bet_color, p_bet_amount)
    RETURNING id INTO v_new_bet_id;

    RETURN QUERY SELECT v_new_bet_id, true, 'Bet placed successfully', v_user_balance;
END;
$$;

-- Create complete_roulette_round function
CREATE OR REPLACE FUNCTION public.complete_roulette_round(
    p_round_id uuid,
    p_result_slot integer,
    p_result_color text,
    p_result_multiplier numeric
) RETURNS TABLE(
    success boolean,
    message text,
    total_bets integer,
    total_payouts numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_bet_record record;
    v_payout_amount numeric;
    v_total_bets integer := 0;
    v_total_payouts numeric := 0;
    v_is_winner boolean;
BEGIN
    -- Update round with results
    UPDATE roulette_rounds
    SET 
        status = 'completed',
        result_slot = p_result_slot,
        result_color = p_result_color,
        result_multiplier = p_result_multiplier,
        completed_at = NOW()
    WHERE id = p_round_id;

    -- Insert result record
    INSERT INTO roulette_results (round_id, result_slot, result_color, result_multiplier)
    VALUES (p_round_id, p_result_slot, p_result_color, p_result_multiplier)
    ON CONFLICT (round_id) DO UPDATE SET
        result_slot = EXCLUDED.result_slot,
        result_color = EXCLUDED.result_color,
        result_multiplier = EXCLUDED.result_multiplier;

    -- Process all bets for this round
    FOR v_bet_record IN
        SELECT id, user_id, bet_color, bet_amount
        FROM roulette_bets
        WHERE round_id = p_round_id
    LOOP
        v_total_bets := v_total_bets + 1;
        
        -- Check if bet wins
        v_is_winner := (v_bet_record.bet_color = p_result_color) OR 
                      (v_bet_record.bet_color = 'green' AND p_result_slot = 0);
        
        IF v_is_winner THEN
            v_payout_amount := v_bet_record.bet_amount * p_result_multiplier;
            v_total_payouts := v_total_payouts + v_payout_amount;
            
            -- Pay out winner
            UPDATE profiles
            SET balance = balance + v_payout_amount
            WHERE id = v_bet_record.user_id;
            
            -- Update bet record
            UPDATE roulette_bets
            SET 
                is_winner = true,
                payout_amount = v_payout_amount,
                updated_at = NOW()
            WHERE id = v_bet_record.id;
        ELSE
            -- Update losing bet
            UPDATE roulette_bets
            SET 
                is_winner = false,
                payout_amount = 0,
                updated_at = NOW()
            WHERE id = v_bet_record.id;
        END IF;
    END LOOP;

    RETURN QUERY SELECT true, 'Round completed successfully', v_total_bets, v_total_payouts;
END;
$$;

-- Create get_or_create_daily_seed function
CREATE OR REPLACE FUNCTION public.get_or_create_daily_seed(p_date date)
RETURNS TABLE(
    id uuid,
    date date,
    server_seed text,
    server_seed_hash text,
    lotto text,
    lotto_hash text,
    is_revealed boolean
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_seed_record record;
BEGIN
    -- Try to get existing seed
    SELECT * INTO v_seed_record
    FROM daily_seeds
    WHERE daily_seeds.date = p_date;

    IF FOUND THEN
        RETURN QUERY SELECT 
            v_seed_record.id,
            v_seed_record.date,
            v_seed_record.server_seed,
            v_seed_record.server_seed_hash,
            v_seed_record.lotto,
            v_seed_record.lotto_hash,
            v_seed_record.is_revealed;
    ELSE
        -- Create new seed
        INSERT INTO daily_seeds (
            date,
            server_seed,
            server_seed_hash,
            lotto,
            lotto_hash,
            is_revealed
        ) VALUES (
            p_date,
            encode(gen_random_bytes(32), 'hex'),
            encode(digest(encode(gen_random_bytes(32), 'hex'), 'sha256'), 'hex'),
            lpad(floor(random() * 10000000000)::text, 10, '0'),
            encode(digest(lpad(floor(random() * 10000000000)::text, 10, '0'), 'sha256'), 'hex'),
            false
        )
        RETURNING 
            daily_seeds.id,
            daily_seeds.date,
            daily_seeds.server_seed,
            daily_seeds.server_seed_hash,
            daily_seeds.lotto,
            daily_seeds.lotto_hash,
            daily_seeds.is_revealed
        INTO v_seed_record;

        RETURN QUERY SELECT 
            v_seed_record.id,
            v_seed_record.date,
            v_seed_record.server_seed,
            v_seed_record.server_seed_hash,
            v_seed_record.lotto,
            v_seed_record.lotto_hash,
            v_seed_record.is_revealed;
    END IF;
END;
$$;

-- Create reveal_daily_seed function
CREATE OR REPLACE FUNCTION public.reveal_daily_seed(p_date date)
RETURNS TABLE(
    success boolean,
    message text,
    server_seed text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_server_seed text;
BEGIN
    UPDATE daily_seeds
    SET 
        is_revealed = true,
        revealed_at = NOW()
    WHERE date = p_date AND is_revealed = false
    RETURNING server_seed INTO v_server_seed;

    IF FOUND THEN
        RETURN QUERY SELECT true, 'Daily seed revealed successfully', v_server_seed;
    ELSE
        RETURN QUERY SELECT false, 'Daily seed not found or already revealed', NULL::text;
    END IF;
END;
$$;

-- Create atomic_bet_balance_check function
CREATE OR REPLACE FUNCTION public.atomic_bet_balance_check(
    p_user_id uuid,
    p_bet_amount numeric
) RETURNS TABLE(
    success boolean,
    current_balance numeric,
    message text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_current_balance numeric;
BEGIN
    SELECT balance INTO v_current_balance
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RETURN QUERY SELECT false, 0::numeric, 'User not found';
        RETURN;
    END IF;

    IF v_current_balance >= p_bet_amount THEN
        RETURN QUERY SELECT true, v_current_balance, 'Balance sufficient';
    ELSE
        RETURN QUERY SELECT false, v_current_balance, 'Insufficient balance';
    END IF;
END;
$$;

-- Create rollback_bet_balance function  
CREATE OR REPLACE FUNCTION public.rollback_bet_balance(
    p_user_id uuid,
    p_bet_amount numeric
) RETURNS TABLE(
    success boolean,
    new_balance numeric
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_new_balance numeric;
BEGIN
    UPDATE profiles
    SET balance = balance + p_bet_amount
    WHERE id = p_user_id
    RETURNING balance INTO v_new_balance;

    IF FOUND THEN
        RETURN QUERY SELECT true, v_new_balance;
    ELSE
        RETURN QUERY SELECT false, 0::numeric;
    END IF;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.place_roulette_bet(uuid, uuid, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_roulette_round(uuid, integer, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_daily_seed(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_daily_seed(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.atomic_bet_balance_check(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_bet_balance(uuid, numeric) TO authenticated;

RAISE NOTICE 'Roulette database schema fix completed successfully!';