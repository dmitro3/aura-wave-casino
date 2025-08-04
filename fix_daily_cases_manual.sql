-- Fix daily cases availability logic
-- This migration ensures that cases become available immediately when users reach the required level
-- and then reset daily after being opened

-- Update the initialize_level_daily_cases function to properly handle availability
CREATE OR REPLACE FUNCTION public.initialize_level_daily_cases(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    level_req INTEGER;
    user_current_level INTEGER;
    existing_case RECORD;
BEGIN
    -- Get user's current level from user_level_stats
    SELECT COALESCE(current_level, 1) INTO user_current_level
    FROM public.user_level_stats
    WHERE user_id = user_uuid;
    
    -- If no level stats found, default to level 1
    IF user_current_level IS NULL THEN
        user_current_level := 1;
    END IF;
    
    -- Create cases for levels 10, 20, 30, etc. up to user's current level + 50
    FOR level_req IN 10..(user_current_level + 50) BY 10 LOOP
        -- Check if case already exists
        SELECT * INTO existing_case
        FROM public.level_daily_cases
        WHERE user_id = user_uuid AND level_required = level_req;
        
        IF existing_case IS NULL THEN
            -- Case doesn't exist, create it
            -- If user has reached this level, make it available immediately
            -- Otherwise, it will become available when they reach the level
            INSERT INTO public.level_daily_cases (user_id, level_required, case_type, is_available, last_reset_date)
            VALUES (
                user_uuid, 
                level_req, 
                'level', 
                CASE WHEN user_current_level >= level_req THEN true ELSE false END,
                CASE WHEN user_current_level >= level_req THEN CURRENT_DATE ELSE NULL END
            );
        ELSE
            -- Case exists, check if we need to make it available
            IF user_current_level >= level_req AND NOT existing_case.is_available AND existing_case.last_reset_date IS NULL THEN
                -- User has reached the level but case was never available, make it available now
                UPDATE public.level_daily_cases 
                SET is_available = true, last_reset_date = CURRENT_DATE
                WHERE user_id = user_uuid AND level_required = level_req;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the get_user_level_daily_cases function to ensure proper availability logic
CREATE OR REPLACE FUNCTION public.get_user_level_daily_cases(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    level_required INTEGER,
    is_available BOOLEAN,
    last_reset_date DATE,
    user_level INTEGER
) AS $$
BEGIN
    -- First, ensure all cases exist for this user and are properly initialized
    PERFORM public.initialize_level_daily_cases(user_uuid);
    
    -- Reset cases that were opened yesterday (daily reset)
    PERFORM public.reset_daily_cases();
    
    -- Return cases with user's current level from user_level_stats
    RETURN QUERY
    SELECT 
        ldc.id,
        ldc.level_required,
        ldc.is_available,
        ldc.last_reset_date,
        COALESCE(uls.current_level, 1) AS user_level
    FROM public.level_daily_cases ldc
    LEFT JOIN public.user_level_stats uls ON uls.user_id = user_uuid
    WHERE ldc.user_id = user_uuid
    ORDER BY ldc.level_required;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the reset_daily_cases function to only reset cases that were actually opened
CREATE OR REPLACE FUNCTION public.reset_daily_cases()
RETURNS VOID AS $$
BEGIN
    -- Reset cases where last_reset_date is not today (meaning they were opened yesterday or earlier)
    -- This ensures cases reset daily after being opened
    UPDATE public.level_daily_cases 
    SET is_available = true, last_reset_date = CURRENT_DATE
    WHERE last_reset_date < CURRENT_DATE AND last_reset_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check and update case availability when user levels up
CREATE OR REPLACE FUNCTION public.check_and_update_case_availability(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    user_current_level INTEGER;
    case_record RECORD;
BEGIN
    -- Get user's current level
    SELECT COALESCE(current_level, 1) INTO user_current_level
    FROM public.user_level_stats
    WHERE user_id = user_uuid;
    
    -- Check all cases for this user
    FOR case_record IN 
        SELECT * FROM public.level_daily_cases 
        WHERE user_id = user_uuid AND level_required <= user_current_level
    LOOP
        -- If user has reached the level but case was never available, make it available now
        IF case_record.level_required <= user_current_level 
           AND NOT case_record.is_available 
           AND case_record.last_reset_date IS NULL THEN
            
            UPDATE public.level_daily_cases 
            SET is_available = true, last_reset_date = CURRENT_DATE
            WHERE id = case_record.id;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically check case availability when user levels up
CREATE OR REPLACE FUNCTION public.handle_level_up_case_availability()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is a level up (current_level increased)
    IF NEW.current_level > OLD.current_level THEN
        -- Check and update case availability for newly reached levels
        PERFORM public.check_and_update_case_availability(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger if it doesn't exist
DROP TRIGGER IF EXISTS trigger_level_up_case_availability ON public.user_level_stats;
CREATE TRIGGER trigger_level_up_case_availability
    AFTER UPDATE ON public.user_level_stats
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_level_up_case_availability();