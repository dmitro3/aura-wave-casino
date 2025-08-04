-- 🧹 CLEANUP DIAGNOSTIC FILES
-- Run this after completing game stats diagnosis to clean up temporary files

-- Remove temporary debug_logs table if it exists
DROP TABLE IF EXISTS public.debug_logs CASCADE;

-- Success message
DO $$ 
BEGIN
  RAISE NOTICE '🧹 Diagnostic cleanup complete - debug_logs table removed';
END $$;