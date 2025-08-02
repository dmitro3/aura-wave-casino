-- Drop unused user_data_view
-- This view is not being used anywhere in the codebase and is safe to remove

DROP VIEW IF EXISTS public.user_data_view CASCADE;

-- Log the cleanup
DO $$
BEGIN
    RAISE NOTICE '✅ Dropped unused user_data_view - database schema cleanup complete';
END $$;