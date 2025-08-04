-- 🖼️ ADD PROFILE PICTURE SUPPORT
-- Add avatar_url column to profiles table and create storage bucket for profile pictures

BEGIN;

-- Add avatar_url column to profiles table if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for profile pictures
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-pictures',
  'profile-pictures', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for profile pictures bucket
CREATE POLICY "Users can upload their own profile pictures" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Profile pictures are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can update their own profile pictures" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile pictures" ON storage.objects
FOR DELETE USING (
  bucket_id = 'profile-pictures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Create RLS policy for updating avatar_url in profiles
CREATE POLICY "Users can update their own avatar_url" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

-- Create function to delete old profile picture when updating
CREATE OR REPLACE FUNCTION public.handle_profile_picture_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_filename text;
BEGIN
  -- If avatar_url is being updated and old value exists
  IF OLD.avatar_url IS NOT NULL AND NEW.avatar_url != OLD.avatar_url THEN
    -- Extract filename from old URL
    old_filename := substring(OLD.avatar_url from '.*/(.+)$');
    
    -- Delete old file from storage if it exists
    IF old_filename IS NOT NULL THEN
      PERFORM storage.delete(ARRAY[OLD.id::text || '/' || old_filename], 'profile-pictures');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profile picture cleanup
DROP TRIGGER IF EXISTS trigger_profile_picture_cleanup ON public.profiles;
CREATE TRIGGER trigger_profile_picture_cleanup
  BEFORE UPDATE OF avatar_url ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_profile_picture_update();

-- Grant permissions
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

COMMIT;