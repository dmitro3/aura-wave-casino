-- UNLOCK ALL RLS PERMISSIONS - NUCLEAR OPTION
-- This script removes ALL Row Level Security restrictions across the entire database

-- Grant ALL permissions to ALL roles on ALL tables
DO $$
DECLARE
    table_record RECORD;
    sequence_record RECORD;
BEGIN
    -- Grant permissions on all tables in public schema
    FOR table_record IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', table_record.tablename);
        RAISE NOTICE 'Granted ALL permissions on table: %', table_record.tablename;
    END LOOP;
    
    -- Grant permissions on all sequences in public schema
    FOR sequence_record IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public'
    LOOP
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', sequence_record.sequencename);
        RAISE NOTICE 'Granted ALL permissions on sequence: %', sequence_record.sequencename;
    END LOOP;
END $$;

-- Grant usage on all sequences in schema
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- Disable RLS on ALL tables in public schema
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', table_record.tablename);
        RAISE NOTICE 'Disabled RLS on table: %', table_record.tablename;
    END LOOP;
END $$;

-- Alternative approach: If you want to keep RLS enabled but make it ultra-permissive
-- Uncomment this section and comment out the DISABLE statements above

/*
-- Drop ALL existing policies and create ultra-permissive ones
DO $$
DECLARE
    table_record RECORD;
    policy_record RECORD;
BEGIN
    -- For each table in public schema
    FOR table_record IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        -- Drop all existing policies on this table
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = table_record.tablename
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_record.tablename);
            RAISE NOTICE 'Dropped policy % on table %', policy_record.policyname, table_record.tablename;
        END LOOP;
        
        -- Create ultra-permissive policy for this table
        EXECUTE format('CREATE POLICY "allow_all_operations" ON public.%I FOR ALL USING (true) WITH CHECK (true)', table_record.tablename);
        RAISE NOTICE 'Created ultra-permissive policy on table: %', table_record.tablename;
    END LOOP;
END $$;
*/

-- Ensure all tables have realtime enabled
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', table_record.tablename);
            RAISE NOTICE 'Set REPLICA IDENTITY FULL on table: %', table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not set REPLICA IDENTITY on table: % (Error: %)', table_record.tablename, SQLERRM;
        END;
        
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_record.tablename);
            RAISE NOTICE 'Added table % to realtime publication', table_record.tablename;
        EXCEPTION
            WHEN duplicate_object THEN
                RAISE NOTICE 'Table % already in realtime publication', table_record.tablename;
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not add table % to realtime publication (Error: %)', table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Specifically ensure critical gaming tables are completely open
GRANT ALL ON public.profiles TO anon, authenticated, service_role;
GRANT ALL ON public.tower_games TO anon, authenticated, service_role;
GRANT ALL ON public.tower_levels TO anon, authenticated, service_role;
GRANT ALL ON public.live_bet_feed TO anon, authenticated, service_role;
GRANT ALL ON public.roulette_rounds TO anon, authenticated, service_role;
GRANT ALL ON public.roulette_bets TO anon, authenticated, service_role;
GRANT ALL ON public.user_level_stats TO anon, authenticated, service_role;
GRANT ALL ON public.achievements TO anon, authenticated, service_role;
GRANT ALL ON public.user_achievements TO anon, authenticated, service_role;
GRANT ALL ON public.chat_messages TO anon, authenticated, service_role;
GRANT ALL ON public.daily_seeds TO anon, authenticated, service_role;
GRANT ALL ON public.roulette_client_seeds TO anon, authenticated, service_role;

-- Show completion message
DO $$
BEGIN
    RAISE NOTICE '🔓 ALL RLS PERMISSIONS UNLOCKED! All tables are now fully accessible.';
    RAISE NOTICE '⚠️  SECURITY WARNING: This removes all access restrictions!';
    RAISE NOTICE '✅ Gaming functions should now work without permission errors.';
END $$;