-- Create table for tracking free case claims
CREATE TABLE public.free_case_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_type TEXT NOT NULL CHECK (case_type IN ('common', 'rare', 'epic')),
  amount NUMERIC NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.free_case_claims ENABLE ROW LEVEL SECURITY;

-- Create policies for free case claims
CREATE POLICY "Users can view their own free case claims" 
ON public.free_case_claims 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own free case claims" 
ON public.free_case_claims 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to check if user can claim a free case
CREATE OR REPLACE FUNCTION public.can_claim_free_case(p_user_id UUID, p_case_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  last_claim TIMESTAMP WITH TIME ZONE;
  cooldown_minutes INTEGER;
BEGIN
  -- Define cooldown periods
  CASE p_case_type
    WHEN 'common' THEN cooldown_minutes := 1;
    WHEN 'rare' THEN cooldown_minutes := 5;
    WHEN 'epic' THEN cooldown_minutes := 15;
    ELSE RETURN FALSE;
  END CASE;
  
  -- Get last claim time for this case type
  SELECT claimed_at INTO last_claim
  FROM public.free_case_claims
  WHERE user_id = p_user_id AND case_type = p_case_type
  ORDER BY claimed_at DESC
  LIMIT 1;
  
  -- If no previous claim, allow
  IF last_claim IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if cooldown has passed
  RETURN (now() - last_claim) >= (cooldown_minutes || ' minutes')::INTERVAL;
END;
$function$;

-- Create function to get next claim time for a case type
CREATE OR REPLACE FUNCTION public.get_next_free_case_claim_time(p_user_id UUID, p_case_type TEXT)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  last_claim TIMESTAMP WITH TIME ZONE;
  cooldown_minutes INTEGER;
BEGIN
  -- Define cooldown periods
  CASE p_case_type
    WHEN 'common' THEN cooldown_minutes := 1;
    WHEN 'rare' THEN cooldown_minutes := 5;
    WHEN 'epic' THEN cooldown_minutes := 15;
    ELSE RETURN NULL;
  END CASE;
  
  -- Get last claim time for this case type
  SELECT claimed_at INTO last_claim
  FROM public.free_case_claims
  WHERE user_id = p_user_id AND case_type = p_case_type
  ORDER BY claimed_at DESC
  LIMIT 1;
  
  -- If no previous claim, can claim now
  IF last_claim IS NULL THEN
    RETURN now();
  END IF;
  
  -- Return next available claim time
  RETURN last_claim + (cooldown_minutes || ' minutes')::INTERVAL;
END;
$function$;