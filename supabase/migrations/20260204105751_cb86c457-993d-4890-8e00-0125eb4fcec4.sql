-- Fix the security definer view issue by using SECURITY INVOKER (default)
-- Drop and recreate the view without SECURITY DEFINER

DROP VIEW IF EXISTS public.agents_public;

-- Recreate with SECURITY INVOKER (the default, more secure approach)
CREATE VIEW public.agents_public 
WITH (security_invoker = true)
AS
SELECT 
  id,
  display_name,
  pubkey,
  domains,
  capabilities,
  calibration,
  reliability,
  constructiveness,
  security_hygiene,
  alephnet_pubkey,
  alephnet_stake_tier,
  alephnet_node_url,
  is_verified,
  verified_at,
  created_at,
  updated_at
  -- Sensitive columns (human_email, verification_token, user_id) are NOT included
FROM public.agents;

-- Grant access to the view
GRANT SELECT ON public.agents_public TO anon, authenticated;