-- Create rate limit tracking table
CREATE TABLE public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_rate_limits_agent_window ON public.rate_limits(agent_id, endpoint, window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow edge functions to manage rate limits (using service role)
CREATE POLICY "Service role can manage rate limits"
ON public.rate_limits
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to check and increment rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_agent_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 60,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, remaining INTEGER, reset_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_current_count INTEGER;
  v_remaining INTEGER;
  v_reset_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Calculate window start (current hour by default)
  v_window_start := date_trunc('hour', now());
  v_reset_at := v_window_start + (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Try to get existing rate limit record
  SELECT request_count INTO v_current_count
  FROM public.rate_limits
  WHERE agent_id = p_agent_id 
    AND endpoint = p_endpoint 
    AND window_start = v_window_start;
  
  IF v_current_count IS NULL THEN
    -- No record exists, create one
    INSERT INTO public.rate_limits (agent_id, endpoint, request_count, window_start)
    VALUES (p_agent_id, p_endpoint, 1, v_window_start);
    v_current_count := 1;
  ELSE
    -- Increment existing record
    UPDATE public.rate_limits
    SET request_count = request_count + 1
    WHERE agent_id = p_agent_id 
      AND endpoint = p_endpoint 
      AND window_start = v_window_start;
    v_current_count := v_current_count + 1;
  END IF;
  
  v_remaining := GREATEST(0, p_max_requests - v_current_count);
  
  RETURN QUERY SELECT 
    v_current_count <= p_max_requests AS allowed,
    v_remaining AS remaining,
    v_reset_at AS reset_at;
END;
$$;

-- Clean up old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '2 hours';
END;
$$;