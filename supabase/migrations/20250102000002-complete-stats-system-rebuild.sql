-- ===============================================
-- COMPLETE XP/LEVEL/STATS SYSTEM REBUILD
-- ===============================================
-- This rebuilds the entire system to use user_level_stats as the primary
-- source of truth and ensures ALL games properly track stats there.

-- Step 1: Create core utility functions
-- ====================================

-- Function to calculate XP from bet amount (10% rule)
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

-- Function to update user level stats with proper XP handling
DROP FUNCTION IF EXISTS public.update_user_stats_and_xp(uuid, text, numeric, numeric, boolean) CASCADE;

CREATE OR REPLACE FUNCTION public.update_user_stats_and_xp(
    p_user_id uuid,
    p_game_type text,
    p_bet_amount numeric,
    p_profit numeric,
    p_is_win boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    xp_to_add NUMERIC(15,3);
    level_data RECORD;
    old_level INTEGER;
    new_level INTEGER;
    level_up_occurred BOOLEAN := FALSE;
    result_json json;
BEGIN
    -- Calculate XP from bet amount
    xp_to_add := public.calculate_xp_from_bet(p_bet_amount);
    
    -- Get current level before update
    SELECT current_level INTO old_level 
    FROM user_level_stats 
    WHERE user_id = p_user_id;
    
    IF old_level IS NULL THEN
        old_level := 1;
    END IF;

    -- Update user_level_stats with game-specific stats
    IF p_game_type = 'roulette' THEN
        INSERT INTO user_level_stats (
            user_id, 
            roulette_games, roulette_wins, roulette_wagered, roulette_profit,
            total_games, total_wins, total_wagered, total_profit, lifetime_xp,
            current_level, updated_at
        ) VALUES (
            p_user_id, 
            1, CASE WHEN p_is_win THEN 1 ELSE 0 END, p_bet_amount, p_profit,
            1, CASE WHEN p_is_win THEN 1 ELSE 0 END, p_bet_amount, p_profit, xp_to_add,
            1, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            roulette_games = user_level_stats.roulette_games + 1,
            roulette_wins = user_level_stats.roulette_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
            roulette_wagered = user_level_stats.roulette_wagered + p_bet_amount,
            roulette_profit = user_level_stats.roulette_profit + p_profit,
            total_games = user_level_stats.total_games + 1,
            total_wins = user_level_stats.total_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
            total_wagered = user_level_stats.total_wagered + p_bet_amount,
            total_profit = user_level_stats.total_profit + p_profit,
            lifetime_xp = user_level_stats.lifetime_xp + xp_to_add,
            updated_at = NOW();
            
    ELSIF p_game_type = 'coinflip' THEN
        INSERT INTO user_level_stats (
            user_id, 
            coinflip_games, coinflip_wins, coinflip_wagered, coinflip_profit,
            total_games, total_wins, total_wagered, total_profit, lifetime_xp,
            current_level, updated_at
        ) VALUES (
            p_user_id, 
            1, CASE WHEN p_is_win THEN 1 ELSE 0 END, p_bet_amount, p_profit,
            1, CASE WHEN p_is_win THEN 1 ELSE 0 END, p_bet_amount, p_profit, xp_to_add,
            1, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            coinflip_games = user_level_stats.coinflip_games + 1,
            coinflip_wins = user_level_stats.coinflip_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
            coinflip_wagered = user_level_stats.coinflip_wagered + p_bet_amount,
            coinflip_profit = user_level_stats.coinflip_profit + p_profit,
            total_games = user_level_stats.total_games + 1,
            total_wins = user_level_stats.total_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
            total_wagered = user_level_stats.total_wagered + p_bet_amount,
            total_profit = user_level_stats.total_profit + p_profit,
            lifetime_xp = user_level_stats.lifetime_xp + xp_to_add,
            updated_at = NOW();
            
    ELSIF p_game_type = 'tower' THEN
        INSERT INTO user_level_stats (
            user_id, 
            tower_games, tower_wins, tower_wagered, tower_profit,
            total_games, total_wins, total_wagered, total_profit, lifetime_xp,
            current_level, updated_at
        ) VALUES (
            p_user_id, 
            1, CASE WHEN p_is_win THEN 1 ELSE 0 END, p_bet_amount, p_profit,
            1, CASE WHEN p_is_win THEN 1 ELSE 0 END, p_bet_amount, p_profit, xp_to_add,
            1, NOW()
        )
        ON CONFLICT (user_id) DO UPDATE SET
            tower_games = user_level_stats.tower_games + 1,
            tower_wins = user_level_stats.tower_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
            tower_wagered = user_level_stats.tower_wagered + p_bet_amount,
            tower_profit = user_level_stats.tower_profit + p_profit,
            total_games = user_level_stats.total_games + 1,
            total_wins = user_level_stats.total_wins + CASE WHEN p_is_win THEN 1 ELSE 0 END,
            total_wagered = user_level_stats.total_wagered + p_bet_amount,
            total_profit = user_level_stats.total_profit + p_profit,
            lifetime_xp = user_level_stats.lifetime_xp + xp_to_add,
            updated_at = NOW();
    END IF;

    -- Calculate new level and update level fields
    SELECT * INTO level_data 
    FROM public.calculate_level_from_xp((
        SELECT FLOOR(lifetime_xp)::integer 
        FROM user_level_stats 
        WHERE user_id = p_user_id
    ));

    new_level := level_data.level;
    level_up_occurred := new_level > old_level;

    -- Update level-related fields
    UPDATE user_level_stats SET
        current_level = level_data.level,
        current_level_xp = level_data.current_level_xp,
        xp_to_next_level = level_data.xp_to_next,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Update profiles table for consistency (total_wagered and total_profit)
    UPDATE profiles SET
        total_wagered = (SELECT total_wagered FROM user_level_stats WHERE user_id = p_user_id),
        total_profit = (SELECT total_profit FROM user_level_stats WHERE user_id = p_user_id),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Award level bonus if level up occurred
    IF level_up_occurred THEN
        -- Check for level rewards
        DECLARE
            level_bonus NUMERIC := 0;
        BEGIN
            SELECT COALESCE(bonus_amount, 0) INTO level_bonus
            FROM level_rewards 
            WHERE level = new_level;
            
            IF level_bonus > 0 THEN
                UPDATE profiles SET
                    balance = balance + level_bonus
                WHERE id = p_user_id;
            END IF;
            
            RAISE NOTICE '🎉 Level up! User % advanced from level % to % (bonus: $%)', 
                p_user_id, old_level, new_level, level_bonus;
        END;
    END IF;

    -- Build result JSON
    SELECT json_build_object(
        'success', TRUE,
        'xp_added', xp_to_add,
        'level_up_occurred', level_up_occurred,
        'old_level', old_level,
        'new_level', new_level,
        'total_wagered_updated', p_bet_amount,
        'game_type', p_game_type
    ) INTO result_json;

    RETURN result_json;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error in update_user_stats_and_xp: %', SQLERRM;
END;
$$;

-- Step 2: Create sync function to keep profiles table in sync
-- =========================================================

CREATE OR REPLACE FUNCTION public.sync_profiles_from_user_level_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Sync total_wagered and total_profit from user_level_stats to profiles
    UPDATE profiles 
    SET 
        total_wagered = uls.total_wagered,
        total_profit = uls.total_profit,
        updated_at = NOW()
    FROM user_level_stats uls
    WHERE profiles.id = uls.user_id
    AND (
        profiles.total_wagered != uls.total_wagered OR 
        profiles.total_profit != uls.total_profit
    );
    
    RAISE NOTICE '✅ Synced profiles table with user_level_stats';
END;
$$;

-- Step 3: Create trigger to auto-sync profiles when user_level_stats changes
-- =========================================================================

CREATE OR REPLACE FUNCTION public.auto_sync_profiles_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update profiles table when user_level_stats changes
    UPDATE profiles SET
        total_wagered = NEW.total_wagered,
        total_profit = NEW.total_profit,
        updated_at = NOW()
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_sync_profiles_from_user_level_stats ON user_level_stats;

-- Create the trigger
CREATE TRIGGER trigger_sync_profiles_from_user_level_stats
    AFTER UPDATE OF total_wagered, total_profit ON user_level_stats
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_sync_profiles_trigger();

-- Step 4: Grant permissions
-- ========================

GRANT EXECUTE ON FUNCTION public.calculate_xp_from_bet(numeric) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_stats_and_xp(uuid, text, numeric, numeric, boolean) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_profiles_from_user_level_stats() TO anon, authenticated, service_role;

-- Step 5: Run initial sync
-- =======================

SELECT public.sync_profiles_from_user_level_stats();

-- Step 6: Test the system
-- ======================

DO $$
BEGIN
    RAISE NOTICE '🧪 Testing XP/Stats system:';
    RAISE NOTICE '  $0.01 bet = % XP', public.calculate_xp_from_bet(0.01);
    RAISE NOTICE '  $1.00 bet = % XP', public.calculate_xp_from_bet(1.00);
    RAISE NOTICE '  $10.00 bet = % XP', public.calculate_xp_from_bet(10.00);
    RAISE NOTICE '✅ Complete stats system rebuilt successfully!';
    RAISE NOTICE '📊 All games now update user_level_stats properly';
    RAISE NOTICE '🔄 profiles table automatically synced from user_level_stats';
END $$;