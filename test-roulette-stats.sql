-- Test Roulette Statistics Function
-- Run this in Supabase SQL Editor to test if the function works

-- Test 1: Check if the function exists
SELECT proname, proargnames, prosrc IS NOT NULL as has_body
FROM pg_proc 
WHERE proname = 'update_user_stats_and_level';

-- Test 2: Check if the new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_level_stats' 
AND column_name LIKE 'roulette_%'
ORDER BY column_name;

-- Test 3: Get your user ID (replace with your actual email)
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Test 4: Check current user stats (replace USER_ID with your actual user UUID)
-- SELECT user_id, current_level, lifetime_xp, roulette_games, roulette_wagered, roulette_profit
-- FROM user_level_stats 
-- WHERE user_id = 'YOUR_USER_ID';

-- Test 5: Manual test of the function (replace USER_ID with your actual user UUID)
-- SELECT * FROM update_user_stats_and_level(
--   'YOUR_USER_ID'::uuid,
--   'roulette',
--   10.00,
--   'win',
--   5.00,
--   0,
--   'red',
--   'red'
-- );

-- Test 6: Check if stats were updated after test
-- SELECT user_id, current_level, lifetime_xp, roulette_games, roulette_wagered, roulette_profit,
--        roulette_red_wins, roulette_green_wins, roulette_black_wins, roulette_favorite_color
-- FROM user_level_stats 
-- WHERE user_id = 'YOUR_USER_ID';

SELECT 'Run the tests above one by one, replacing YOUR_USER_ID with your actual user UUID' as instructions;