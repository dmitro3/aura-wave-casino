-- Enable realtime for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for profiles table (for balance updates)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Enable realtime for tips table (for tip events)
ALTER TABLE public.tips REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tips;