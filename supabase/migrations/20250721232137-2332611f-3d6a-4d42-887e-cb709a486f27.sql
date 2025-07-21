-- Fix the notification system completely
-- First, let's check if the function exists and recreate it properly

-- Drop and recreate the notification function to fix any issues
DROP FUNCTION IF EXISTS public.create_tip_notifications() CASCADE;

CREATE OR REPLACE FUNCTION public.create_tip_notifications()
RETURNS TRIGGER AS $$
DECLARE
  sender_username TEXT;
  receiver_username TEXT;
BEGIN
  -- Get usernames
  SELECT username INTO sender_username FROM public.profiles WHERE id = NEW.from_user_id;
  SELECT username INTO receiver_username FROM public.profiles WHERE id = NEW.to_user_id;
  
  -- Create notification for sender (only one)
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.from_user_id,
    'tip_sent',
    'Tip Sent Successfully',
    'You sent $' || NEW.amount::TEXT || ' to ' || receiver_username,
    jsonb_build_object(
      'amount', NEW.amount,
      'to_username', receiver_username,
      'to_user_id', NEW.to_user_id,
      'tip_message', NEW.message,
      'tip_id', NEW.id
    )
  );
  
  -- Create notification for receiver (only one)
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.to_user_id,
    'tip_received',
    'Tip Received!',
    'You received $' || NEW.amount::TEXT || ' from ' || sender_username ||
    CASE 
      WHEN NEW.message IS NOT NULL AND NEW.message != '' 
      THEN ': "' || NEW.message || '"'
      ELSE ''
    END,
    jsonb_build_object(
      'amount', NEW.amount,
      'from_username', sender_username,
      'from_user_id', NEW.from_user_id,
      'tip_message', NEW.message,
      'tip_id', NEW.id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;