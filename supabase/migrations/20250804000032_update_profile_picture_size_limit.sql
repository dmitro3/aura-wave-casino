-- 📏 UPDATE PROFILE PICTURE SIZE LIMIT
-- Reduce profile picture upload limit from 5MB to 1MB

BEGIN;

-- Update the file size limit for profile-pictures bucket
UPDATE storage.buckets 
SET file_size_limit = 1048576  -- 1MB limit (1024 * 1024 bytes)
WHERE id = 'profile-pictures';

COMMIT;