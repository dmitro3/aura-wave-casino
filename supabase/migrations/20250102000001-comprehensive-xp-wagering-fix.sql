-- COMPREHENSIVE XP AND WAGERING SYSTEM FIX
-- This migration ensures that ALL games (roulette, coinflip, tower, etc.) properly:
-- 1. Update total_wagered when bets are placed
-- 2. Award XP at 10% of bet amount (with 3 decimal precision)
-- 3. Handle level progression correctly

-- Step 1: Ensure XP calculation function uses correct precision
DROP FUNCTION IF EXISTS public.calculate_xp_from_bet(numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_xp_from_bet(bet_amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Calculate XP as exactly 10% of bet amount, rounded to 3 decimal places
    -- $1.00 bet = 0.100 XP, $0.01 bet = 0.001 XP
    RETURN ROUND((bet_amount * 0.1)::numeric, 3);
END;
$$;

-- Step 2: Ensure add_xp_and_check_levelup function exists and works with numeric precision
DROP FUNCTION IF EXISTS public.add_xp_and_check_levelup(uuid, numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.add_xp_and_check_levelup(
    user_uuid uuid,
    xp_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    new_total_xp NUMERIC(15,3);
    new_level_data RECORD;
    level_up_occurred BOOLEAN := FALSE;
    old_level INTEGER;
    level_reward NUMERIC := 0;
BEGIN
    -- Get current user data from user_level_stats (primary source of truth)
    SELECT uls.*, p.balance 
    INTO user_record
    FROM user_level_stats uls
    JOIN profiles p ON p.id = uls.user_id
    WHERE uls.user_id = user_uuid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User % not found in user_level_stats', user_uuid;
    END IF;

    old_level := user_record.current_level;

    -- Calculate new total XP with 3 decimal precision
    new_total_xp := user_record.lifetime_xp + xp_amount;

    -- Get level information based on new XP
    SELECT * INTO new_level_data 
    FROM public.calculate_level_from_xp(FLOOR(new_total_xp)::integer);

    -- Check if level up occurred
    IF new_level_data.level > old_level THEN
        level_up_occurred := TRUE;
        
        -- Calculate level reward (if any level rewards exist)
        SELECT COALESCE(bonus_amount, 0) INTO level_reward
        FROM level_rewards 
        WHERE level = new_level_data.level;
        
        RAISE NOTICE '🎉 Level up! User % advanced from level % to %', 
            user_uuid, old_level, new_level_data.level;
    END IF;

    -- Update user_level_stats (primary table for XP/level data)
    UPDATE user_level_stats SET
        lifetime_xp = new_total_xp,
        current_level = new_level_data.level,
        current_level_xp = new_level_data.current_level_xp,
        xp_to_next_level = new_level_data.xp_to_next,
        updated_at = NOW()
    WHERE user_id = user_uuid;

    -- Update profiles table balance if level reward exists
    IF level_reward > 0 THEN
        UPDATE profiles SET
            balance = balance + level_reward,
            updated_at = NOW()
        WHERE id = user_uuid;
    END IF;

    -- Return result
    RETURN json_build_object(
        'success', TRUE,
        'xp_added', xp_amount,
        'new_total_xp', new_total_xp,
        'level_up_occurred', level_up_occurred,
        'old_level', old_level,
        'new_level', new_level_data.level,
        'level_reward', level_reward
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in add_xp_and_check_levelup: %', SQLERRM;
END;
$$;

-- Step 3: Create helper function to add wagering + XP in one call
CREATE OR REPLACE FUNCTION public.add_wager_and_xp(
    user_uuid uuid,
    wager_amount numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    calculated_xp NUMERIC(15,3);
    xp_result json;
BEGIN
    -- Calculate XP from wager (10% of bet amount)
    calculated_xp := public.calculate_xp_from_bet(wager_amount);
    
    -- Update total_wagered in profiles table
    UPDATE profiles SET
        total_wagered = total_wagered + wager_amount,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    -- Add XP and check for level up
    SELECT public.add_xp_and_check_levelup(user_uuid, calculated_xp) INTO xp_result;
    
    -- Return combined result
    RETURN json_build_object(
        'success', TRUE,
        'wager_added', wager_amount,
        'xp_calculated', calculated_xp,
        'xp_result', xp_result
    );

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in add_wager_and_xp: %', SQLERRM;
END;
$$;

-- Step 4: Create trigger to automatically add XP when total_wagered is updated
-- This ensures backward compatibility and catches any missed updates

CREATE OR REPLACE FUNCTION public.auto_add_xp_on_wager()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    wager_increase NUMERIC(15,3);
    calculated_xp NUMERIC(15,3);
BEGIN
    -- Only process if total_wagered actually increased
    IF NEW.total_wagered > OLD.total_wagered THEN
        wager_increase := NEW.total_wagered - OLD.total_wagered;
        calculated_xp := public.calculate_xp_from_bet(wager_increase);
        
        -- Add XP (don't update total_wagered again to avoid infinite loop)
        PERFORM public.add_xp_and_check_levelup(NEW.id, calculated_xp);
        
        RAISE NOTICE '🎯 Auto-added % XP for % wager increase for user %', 
            calculated_xp, wager_increase, NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_auto_add_xp_on_wager ON profiles;

-- Create the trigger
CREATE TRIGGER trigger_auto_add_xp_on_wager
    AFTER UPDATE OF total_wagered ON profiles
    FOR EACH ROW
    WHEN (NEW.total_wagered > OLD.total_wagered)
    EXECUTE FUNCTION public.auto_add_xp_on_wager();

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.calculate_xp_from_bet(numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_xp_and_check_levelup(uuid, numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.add_wager_and_xp(uuid, numeric) TO anon, authenticated, service_role;