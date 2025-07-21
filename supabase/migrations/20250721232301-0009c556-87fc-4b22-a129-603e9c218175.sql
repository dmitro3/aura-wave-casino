-- Create the trigger with explicit permissions
DROP TRIGGER IF EXISTS tips_create_notifications ON public.tips;

-- Create the trigger
CREATE TRIGGER tips_create_notifications
  AFTER INSERT ON public.tips
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tip_notifications();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticator;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticator;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticator;

-- Test that the trigger exists
SELECT 
  t.trigger_name,
  t.event_manipulation,
  t.action_timing,
  t.event_object_table,
  t.action_statement
FROM information_schema.triggers t
WHERE t.event_object_table = 'tips';