-- Fix current user levels using the improved calculation
-- This will update all existing users to have correct levels based on their total XP

DO $$
DECLARE
    user_record RECORD;
    level_calc RECORD;
BEGIN
    -- Update all users with correct level calculations
    FOR user_record IN SELECT user_id, lifetime_xp FROM user_level_stats LOOP
        -- Calculate correct level for this user's XP
        SELECT * INTO level_calc FROM public.calculate_level_from_xp_new(user_record.lifetime_xp);
        
        -- Update the user's stats with correct level data
        UPDATE user_level_stats 
        SET 
            current_level = level_calc.level,
            current_level_xp = level_calc.current_level_xp,
            xp_to_next_level = level_calc.xp_to_next
        WHERE user_id = user_record.user_id;
        
        -- Also update the main profiles table to keep it in sync
        UPDATE profiles 
        SET 
            current_level = level_calc.level,
            current_xp = level_calc.current_level_xp,
            xp_to_next_level = level_calc.xp_to_next,
            lifetime_xp = user_record.lifetime_xp
        WHERE id = user_record.user_id;
    END LOOP;
    
    RAISE NOTICE 'Successfully recalculated levels for all users';
END $$;