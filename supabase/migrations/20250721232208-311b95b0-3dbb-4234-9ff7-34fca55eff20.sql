-- Now create the trigger properly
CREATE TRIGGER tips_create_notifications
  AFTER INSERT ON public.tips
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tip_notifications();

-- Verify the trigger was created
SELECT trigger_name, event_manipulation, action_timing, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'tips';