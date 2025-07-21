-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tip_sent', 'tip_received', 'achievement_unlocked', 'level_up')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to create notifications for tips
CREATE OR REPLACE FUNCTION public.create_tip_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
DECLARE
  sender_username TEXT;
  receiver_username TEXT;
BEGIN
  -- Get usernames
  SELECT username INTO sender_username FROM public.profiles WHERE id = NEW.from_user_id;
  SELECT username INTO receiver_username FROM public.profiles WHERE id = NEW.to_user_id;
  
  -- Create notification for sender
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
  
  -- Create notification for receiver
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
$$;

-- Create trigger for tip notifications
CREATE TRIGGER trigger_tip_notifications
  AFTER INSERT ON public.tips
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tip_notifications();

-- Create index for better performance
CREATE INDEX idx_notifications_user_id_created_at ON public.notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;