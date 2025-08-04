-- Update level daily cases to use new level requirements
-- New levels: 2, 5, 25, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000

-- 1. First, drop the existing check constraint that limits levels to 10-100
ALTER TABLE public.level_daily_cases DROP CONSTRAINT IF EXISTS level_daily_cases_level_required_check;

-- 2. Add new check constraint for the expanded level range (2-1000)
ALTER TABLE public.level_daily_cases ADD CONSTRAINT level_daily_cases_level_required_check 
CHECK (level_required >= 2 AND level_required <= 1000);

-- 3. Delete all existing level daily cases
DELETE FROM public.level_daily_cases;

-- 4. Update the initialize_level_daily_cases function to use new level requirements
CREATE OR REPLACE FUNCTION public.initialize_level_daily_cases(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    user_current_level INTEGER;
    level_req INTEGER;
    existing_case RECORD;
    new_levels INTEGER[] := ARRAY[2, 5, 25, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600, 700, 800, 900, 1000];
BEGIN
    -- Get user's current level
    SELECT COALESCE(current_level, 1) INTO user_current_level
    FROM public.user_level_stats
    WHERE user_id = user_uuid;
    
    -- If no level stats found, default to level 1
    IF user_current_level IS NULL THEN
        user_current_level := 1;
    END IF;
    
    -- Create cases for each new level requirement
    FOREACH level_req IN ARRAY new_levels LOOP
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

-- 5. Update the get_user_level_daily_cases function to work with new levels
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

-- 6. Reinitialize cases for all existing users to ensure consistency
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT DISTINCT user_id FROM public.user_level_stats
    LOOP
        PERFORM public.initialize_level_daily_cases(user_record.user_id);
    END LOOP;
    
    RAISE NOTICE 'Reinitialized level daily cases for all users with new level requirements';
END $$;

-- 7. Verification
SELECT 'Level daily cases updated with new requirements' as status;

SELECT 
    'Available level cases:' as info,
    array_agg(DISTINCT level_required ORDER BY level_required) as available_levels
FROM public.level_daily_cases;

SELECT 
    level_required,
    COUNT(*) as user_count
FROM public.level_daily_cases
GROUP BY level_required
ORDER BY level_required;