-- Drop any existing triggers to avoid duplicates
DROP TRIGGER IF EXISTS after_tip_insert ON public.tips;

-- Create the trigger for tip notifications
CREATE TRIGGER after_tip_insert
  AFTER INSERT ON public.tips
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tip_notifications();

-- Also ensure we have an update trigger for profiles to make balance updates work
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();