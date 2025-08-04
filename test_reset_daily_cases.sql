-- Test function to reset all daily cases for a specific user (for testing only)
CREATE OR REPLACE FUNCTION public.test_reset_user_daily_cases(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Reset ALL cases for the specified user to make them available again
    -- This is for testing purposes only
    UPDATE public.level_daily_cases 
    SET is_available = true, last_reset_date = CURRENT_DATE
    WHERE user_id = user_uuid;
    
    RAISE NOTICE 'Reset all daily cases for user %', user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;