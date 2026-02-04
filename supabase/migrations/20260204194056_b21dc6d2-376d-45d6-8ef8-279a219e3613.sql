-- Remove the overly permissive RLS policy on rate_limits table
-- Service role bypasses RLS, so it doesn't need an explicit policy
-- By having no policies, regular users cannot access the table at all

DROP POLICY IF EXISTS "Service role can manage rate limits" ON public.rate_limits;

-- Ensure RLS is still enabled (blocking all non-service-role access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner as well (extra security)
ALTER TABLE public.rate_limits FORCE ROW LEVEL SECURITY;