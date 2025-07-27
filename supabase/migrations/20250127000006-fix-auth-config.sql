-- Fix auth configuration warnings
-- This migration provides guidance for fixing auth-related security warnings

-- Note: The following warnings need to be addressed in the Supabase Dashboard:

-- 1. Auth OTP long expiry warning
--    - Go to Authentication > Settings > Email Templates
--    - Set OTP expiry to less than 1 hour (recommended: 15-30 minutes)
--    - This prevents OTP codes from being valid for too long

-- 2. Leaked password protection disabled
--    - Go to Authentication > Settings > Security
--    - Enable "Leaked password protection"
--    - This checks passwords against HaveIBeenPwned.org database

-- These settings cannot be changed via SQL migrations
-- They must be configured through the Supabase Dashboard

-- For reference, the recommended settings are:
-- - OTP expiry: 15-30 minutes (not more than 1 hour)
-- - Leaked password protection: Enabled
-- - Password strength requirements: Enabled
-- - Email confirmations: Required for new signups
-- - Phone confirmations: Optional (based on your needs)

-- The function search path warnings have been fixed in the previous migration
-- All functions now have explicit search_path = public settings