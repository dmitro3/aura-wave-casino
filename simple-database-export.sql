-- SIMPLE DATABASE EXPORT - Everything in one go

-- 1. List all tables with row counts
SELECT 
    'TABLE_OVERVIEW' as section,
    t.tablename as table_name,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.tablename AND table_schema = 'public') as exists_check,
    pg_size_pretty(pg_total_relation_size('public.'||t.tablename)) as size
FROM pg_tables t 
WHERE t.schemaname = 'public'
ORDER BY t.tablename;

-- 2. All table structures
SELECT 
    'TABLE_STRUCTURE' as section,
    c.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    c.character_maximum_length
FROM information_schema.columns c
WHERE c.table_schema = 'public'
ORDER BY c.table_name, c.ordinal_position;

-- 3. All RLS policies
SELECT 
    'RLS_POLICIES' as section,
    schemaname,
    tablename,
    policyname,
    cmd,
    roles::text as roles
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4. All functions
SELECT 
    'FUNCTIONS' as section,
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name NOT LIKE 'pg_%'
ORDER BY routine_name;

-- 5. All indexes
SELECT 
    'INDEXES' as section,
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Sample data from key tables
SELECT 'ACHIEVEMENTS_DATA' as section, * FROM public.achievements ORDER BY created_at LIMIT 5;

SELECT 'USER_ACHIEVEMENTS_DATA' as section, * FROM public.user_achievements ORDER BY unlocked_at DESC LIMIT 5;

SELECT 'PROFILES_DATA' as section, id, username, balance, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 3;

SELECT 'USER_LEVEL_STATS_DATA' as section, user_id, current_level, current_level_xp, total_games, total_wagered, tower_games FROM public.user_level_stats ORDER BY current_level DESC LIMIT 3;

SELECT 'TOWER_GAMES_DATA' as section, id, user_id, difficulty, bet_amount, status, created_at FROM public.tower_games ORDER BY created_at DESC LIMIT 3;

SELECT 'LIVE_BET_FEED_DATA' as section, id, username, game_type, bet_amount, result, created_at FROM public.live_bet_feed ORDER BY created_at DESC LIMIT 5;

SELECT 'ROULETTE_ROUNDS_DATA' as section, * FROM public.roulette_rounds ORDER BY created_at DESC LIMIT 3;

SELECT 'CHAT_MESSAGES_DATA' as section, id, username, LEFT(message, 50) as message_preview, created_at FROM public.chat_messages ORDER BY created_at DESC LIMIT 3;