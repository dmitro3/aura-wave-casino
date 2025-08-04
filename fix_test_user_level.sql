-- Fix the test user's level and investigate the issue
DO $$
DECLARE
  test_user_id uuid := '7420ed48-4a12-4544-b5b6-05a52293ba22';
  current_stats RECORD;
  level_result RECORD;
  rounded_xp integer;
BEGIN
  -- Get current user stats
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  RAISE NOTICE 'Current user stats:';
  RAISE NOTICE '  - Current Level: %', current_stats.current_level;
  RAISE NOTICE '  - Lifetime XP: %', current_stats.lifetime_xp;
  RAISE NOTICE '  - Current Level XP: %', current_stats.current_level_xp;
  RAISE NOTICE '  - XP to Next: %', current_stats.xp_to_next_level;
  
  -- Test the conversion
  rounded_xp := ROUND(current_stats.lifetime_xp, 3)::integer;
  RAISE NOTICE 'Rounded XP for calculation: %', rounded_xp;
  
  -- Test the level calculation
  SELECT * INTO level_result 
  FROM public.calculate_level_from_xp(rounded_xp);
  
  RAISE NOTICE 'Level calculation says:';
  RAISE NOTICE '  - Should be Level: %', level_result.user_level;
  RAISE NOTICE '  - Should have Current Level XP: %', level_result.current_level_xp;
  RAISE NOTICE '  - Should have XP to Next: %', level_result.xp_to_next;
  
  -- Manually recalculate and update
  RAISE NOTICE 'Manually updating user level...';
  
  UPDATE public.user_level_stats
  SET 
    current_level = level_result.user_level,
    current_level_xp = level_result.current_level_xp,
    xp_to_next_level = level_result.xp_to_next,
    updated_at = now()
  WHERE user_id = test_user_id;
  
  -- Verify the update
  SELECT * INTO current_stats 
  FROM public.user_level_stats 
  WHERE user_id = test_user_id;
  
  RAISE NOTICE 'After manual update:';
  RAISE NOTICE '  - Current Level: %', current_stats.current_level;
  RAISE NOTICE '  - Lifetime XP: %', current_stats.lifetime_xp;
  RAISE NOTICE '  - Current Level XP: %', current_stats.current_level_xp;
  RAISE NOTICE '  - XP to Next: %', current_stats.xp_to_next_level;
  
END $$;