-- Create the missing trigger for tip notifications
CREATE TRIGGER after_tip_insert
  AFTER INSERT ON public.tips
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tip_notifications();