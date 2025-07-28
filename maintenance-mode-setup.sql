-- Maintenance Mode System Setup
-- This creates a maintenance mode that can be toggled on/off

-- Create maintenance settings table
CREATE TABLE IF NOT EXISTS public.maintenance_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  maintenance_message TEXT DEFAULT 'Website is currently under maintenance. Please check back soon.',
  maintenance_title TEXT DEFAULT 'Under Maintenance',
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default maintenance settings (maintenance OFF by default)
INSERT INTO public.maintenance_settings (is_maintenance_mode, maintenance_message, maintenance_title)
VALUES (false, 'Website is currently under maintenance. Please check back soon.', 'Under Maintenance')
ON CONFLICT DO NOTHING;

-- Enable RLS on maintenance settings
ALTER TABLE public.maintenance_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for maintenance settings
CREATE POLICY "Anyone can view maintenance settings" 
ON public.maintenance_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can update maintenance settings" 
ON public.maintenance_settings 
FOR UPDATE 
USING (auth.role() = 'service_role');

CREATE POLICY "Only service role can insert maintenance settings" 
ON public.maintenance_settings 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Function to toggle maintenance mode
CREATE OR REPLACE FUNCTION public.toggle_maintenance_mode(
  p_enable BOOLEAN,
  p_message TEXT DEFAULT NULL,
  p_title TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_settings RECORD;
  result JSON;
BEGIN
  -- Get current settings
  SELECT * INTO current_settings FROM public.maintenance_settings LIMIT 1;
  
  -- Update maintenance mode
  UPDATE public.maintenance_settings 
  SET 
    is_maintenance_mode = p_enable,
    maintenance_message = COALESCE(p_message, maintenance_message),
    maintenance_title = COALESCE(p_title, maintenance_title),
    started_at = CASE WHEN p_enable THEN now() ELSE started_at END,
    ended_at = CASE WHEN NOT p_enable THEN now() ELSE ended_at END,
    updated_at = now()
  WHERE id = current_settings.id;
  
  -- Return result
  SELECT 
    jsonb_build_object(
      'success', true,
      'maintenance_mode', p_enable,
      'message', CASE WHEN p_enable THEN 'Maintenance mode enabled' ELSE 'Maintenance mode disabled' END,
      'settings', jsonb_build_object(
        'is_maintenance_mode', p_enable,
        'maintenance_message', COALESCE(p_message, current_settings.maintenance_message),
        'maintenance_title', COALESCE(p_title, current_settings.maintenance_title)
      )
    ) INTO result;
    
  RETURN result;
END;
$$;

-- Function to get current maintenance status
CREATE OR REPLACE FUNCTION public.get_maintenance_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  settings RECORD;
  result JSON;
BEGIN
  SELECT * INTO settings FROM public.maintenance_settings LIMIT 1;
  
  SELECT 
    jsonb_build_object(
      'is_maintenance_mode', settings.is_maintenance_mode,
      'maintenance_message', settings.maintenance_message,
      'maintenance_title', settings.maintenance_title,
      'started_at', settings.started_at,
      'ended_at', settings.ended_at
    ) INTO result;
    
  RETURN result;
END;
$$;

-- Enable realtime for maintenance settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_settings;

-- Test the functions
SELECT public.get_maintenance_status();