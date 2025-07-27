-- COMPLETE DATABASE REPORT
-- This script generates a comprehensive overview of your entire database

-- =============================================================================
-- SECTION 1: DATABASE OVERVIEW
-- =============================================================================

DO $$
BEGIN
    RAISE NOTICE '🗄️  === COMPLETE DATABASE REPORT ===';
    RAISE NOTICE '📊 Generated at: %', NOW();
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- SECTION 2: ALL TABLES WITH ROW COUNTS AND SIZES
-- =============================================================================

DO $$
DECLARE
    table_info RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE '📋 === ALL TABLES OVERVIEW ===';
    RAISE NOTICE '';
    
    FOR table_info IN 
        SELECT 
            schemaname,
            tablename,
            pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    LOOP
        -- Get row count for each table
        EXECUTE format('SELECT COUNT(*) FROM %I.%I', table_info.schemaname, table_info.tablename) INTO row_count;
        
        RAISE NOTICE 'Table: % | Rows: % | Size: %', 
            table_info.tablename, 
            row_count, 
            table_info.size;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- SECTION 3: DETAILED TABLE STRUCTURES
-- =============================================================================

DO $$
DECLARE
    table_name TEXT;
    column_info RECORD;
BEGIN
    RAISE NOTICE '🏗️  === TABLE STRUCTURES ===';
    RAISE NOTICE '';
    
    FOR table_name IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
    LOOP
        RAISE NOTICE '📄 TABLE: %', table_name;
        RAISE NOTICE '----------------------------------------';
        
        FOR column_info IN
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default,
                character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' 
            AND table_name = table_name
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  • % | % | Nullable: % | Default: %', 
                column_info.column_name,
                column_info.data_type,
                column_info.is_nullable,
                COALESCE(column_info.column_default, 'NULL');
        END LOOP;
        
        RAISE NOTICE '';
    END LOOP;
END $$;

-- =============================================================================
-- SECTION 4: SAMPLE DATA FROM EACH TABLE (First 3 rows)
-- =============================================================================

-- Achievements table
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
BEGIN
    RAISE NOTICE '🎯 === ACHIEVEMENTS TABLE DATA ===';
    
    FOR rec IN SELECT * FROM public.achievements ORDER BY created_at LIMIT 3
    LOOP
        counter := counter + 1;
        RAISE NOTICE 'Achievement %: ID=% | Name=% | Category=% | Rarity=% | Difficulty=% | Reward=% %', 
            counter, rec.id, rec.name, rec.category, rec.rarity, rec.difficulty, rec.reward_amount, rec.reward_type;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- User achievements table
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.user_achievements;
    RAISE NOTICE '🏆 === USER ACHIEVEMENTS TABLE DATA (Total: %) ===', total_count;
    
    FOR rec IN SELECT * FROM public.user_achievements ORDER BY unlocked_at DESC LIMIT 5
    LOOP
        counter := counter + 1;
        RAISE NOTICE 'User Achievement %: UserID=% | AchievementID=% | UnlockedAt=%', 
            counter, rec.user_id, rec.achievement_id, rec.unlocked_at;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- User level stats table
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.user_level_stats;
    RAISE NOTICE '📊 === USER LEVEL STATS TABLE DATA (Total: %) ===', total_count;
    
    FOR rec IN SELECT * FROM public.user_level_stats ORDER BY current_level DESC LIMIT 3
    LOOP
        counter := counter + 1;
        RAISE NOTICE 'User Stats %: UserID=% | Level=% | XP=% | TotalGames=% | TotalWagered=% | TowerGames=%', 
            counter, rec.user_id, rec.current_level, rec.current_level_xp, rec.total_games, rec.total_wagered, rec.tower_games;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- Profiles table
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.profiles;
    RAISE NOTICE '👤 === PROFILES TABLE DATA (Total: %) ===', total_count;
    
    FOR rec IN SELECT * FROM public.profiles ORDER BY created_at DESC LIMIT 3
    LOOP
        counter := counter + 1;
        RAISE NOTICE 'Profile %: ID=% | Username=% | Balance=% | CreatedAt=%', 
            counter, rec.id, rec.username, rec.balance, rec.created_at;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- Tower games table
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.tower_games;
    RAISE NOTICE '🏗️  === TOWER GAMES TABLE DATA (Total: %) ===', total_count;
    
    FOR rec IN SELECT * FROM public.tower_games ORDER BY created_at DESC LIMIT 3
    LOOP
        counter := counter + 1;
        RAISE NOTICE 'Tower Game %: ID=% | UserID=% | Difficulty=% | BetAmount=% | Status=% | CreatedAt=%', 
            counter, rec.id, rec.user_id, rec.difficulty, rec.bet_amount, rec.status, rec.created_at;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- Live bet feed table
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.live_bet_feed;
    RAISE NOTICE '📡 === LIVE BET FEED TABLE DATA (Total: %) ===', total_count;
    
    FOR rec IN SELECT * FROM public.live_bet_feed ORDER BY created_at DESC LIMIT 5
    LOOP
        counter := counter + 1;
        RAISE NOTICE 'Live Bet %: ID=% | Username=% | GameType=% | BetAmount=% | Result=% | CreatedAt=%', 
            counter, rec.id, rec.username, rec.game_type, rec.bet_amount, rec.result, rec.created_at;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- Roulette rounds table
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.roulette_rounds;
    RAISE NOTICE '🎯 === ROULETTE ROUNDS TABLE DATA (Total: %) ===', total_count;
    
    FOR rec IN SELECT * FROM public.roulette_rounds ORDER BY created_at DESC LIMIT 3
    LOOP
        counter := counter + 1;
        RAISE NOTICE 'Roulette Round %: ID=% | Status=% | WinningNumber=% | CreatedAt=%', 
            counter, rec.id, rec.status, rec.winning_number, rec.created_at;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- Chat messages table
DO $$
DECLARE
    rec RECORD;
    counter INTEGER := 0;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.chat_messages;
    RAISE NOTICE '💬 === CHAT MESSAGES TABLE DATA (Total: %) ===', total_count;
    
    FOR rec IN SELECT * FROM public.chat_messages ORDER BY created_at DESC LIMIT 3
    LOOP
        counter := counter + 1;
        RAISE NOTICE 'Chat Message %: ID=% | Username=% | Message=% | CreatedAt=%', 
            counter, rec.id, rec.username, LEFT(rec.message, 50), rec.created_at;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- SECTION 5: RLS POLICIES
-- =============================================================================

DO $$
DECLARE
    policy_info RECORD;
BEGIN
    RAISE NOTICE '🔒 === RLS POLICIES ===';
    RAISE NOTICE '';
    
    FOR policy_info IN
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname
    LOOP
        RAISE NOTICE 'Table: % | Policy: % | Command: % | Roles: %', 
            policy_info.tablename,
            policy_info.policyname,
            policy_info.cmd,
            array_to_string(policy_info.roles, ', ');
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- SECTION 6: FUNCTIONS AND TRIGGERS
-- =============================================================================

DO $$
DECLARE
    func_info RECORD;
BEGIN
    RAISE NOTICE '⚙️  === CUSTOM FUNCTIONS ===';
    RAISE NOTICE '';
    
    FOR func_info IN
        SELECT 
            routine_name,
            routine_type,
            data_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name NOT LIKE 'pg_%'
        ORDER BY routine_name
    LOOP
        RAISE NOTICE 'Function: % | Type: % | Returns: %', 
            func_info.routine_name,
            func_info.routine_type,
            func_info.data_type;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- SECTION 7: INDEXES
-- =============================================================================

DO $$
DECLARE
    index_info RECORD;
BEGIN
    RAISE NOTICE '📇 === INDEXES ===';
    RAISE NOTICE '';
    
    FOR index_info IN
        SELECT 
            schemaname,
            tablename,
            indexname,
            indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE 'Table: % | Index: %', 
            index_info.tablename,
            index_info.indexname;
    END LOOP;
    
    RAISE NOTICE '';
END $$;

-- =============================================================================
-- SECTION 8: SUMMARY
-- =============================================================================

DO $$
DECLARE
    total_tables INTEGER;
    total_functions INTEGER;
    total_indexes INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_tables FROM pg_tables WHERE schemaname = 'public';
    SELECT COUNT(*) INTO total_functions FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name NOT LIKE 'pg_%';
    SELECT COUNT(*) INTO total_indexes FROM pg_indexes WHERE schemaname = 'public';
    
    RAISE NOTICE '📊 === DATABASE SUMMARY ===';
    RAISE NOTICE 'Total Tables: %', total_tables;
    RAISE NOTICE 'Total Functions: %', total_functions;
    RAISE NOTICE 'Total Indexes: %', total_indexes;
    RAISE NOTICE '';
    RAISE NOTICE '✅ Report Complete!';
END $$;