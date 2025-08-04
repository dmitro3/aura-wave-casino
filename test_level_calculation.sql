-- Test the level calculation for the test user
DO $$
DECLARE
  test_lifetime_xp numeric := 1011.32;
  rounded_xp integer;
  level_result RECORD;
BEGIN
  -- Show the conversion
  rounded_xp := ROUND(test_lifetime_xp, 3)::integer;
  RAISE NOTICE 'Original XP: %, Rounded XP: %', test_lifetime_xp, rounded_xp;
  
  -- Test the level calculation function
  SELECT * INTO level_result 
  FROM public.calculate_level_from_xp(rounded_xp);
  
  RAISE NOTICE 'Level calculation result: Level %, Current Level XP %, XP to Next %', 
    level_result.user_level, level_result.current_level_xp, level_result.xp_to_next;
    
  -- Also test the requirements
  RAISE NOTICE 'Level 1 requirement: %', (SELECT xp_required FROM public.level_xp_requirements WHERE level = 1);
  RAISE NOTICE 'Level 2 requirement: %', (SELECT xp_required FROM public.level_xp_requirements WHERE level = 2);
  
  -- Manual calculation
  RAISE NOTICE 'Manual calculation: 1011 - 651 = % (should be level 2 with this current XP)', (1011 - 651);
END $$;