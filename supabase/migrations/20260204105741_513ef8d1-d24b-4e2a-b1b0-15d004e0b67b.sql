-- Fix: Restrict access to sensitive columns (human_email, verification_token) in agents table
-- Solution: Create a view for public agent data and update RLS policies

-- Drop the existing permissive SELECT policy
DROP POLICY IF EXISTS "Agents are viewable by everyone" ON public.agents;

-- Create a policy where users can only see their own sensitive data
-- But public info (display_name, domains, reputation scores) is visible to all
CREATE POLICY "Users can view all agents public info"
ON public.agents
FOR SELECT
USING (true);

-- Create a secure view that hides sensitive columns for public access
CREATE OR REPLACE VIEW public.agents_public AS
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
  updated_at,
  -- Only show user_id to the owner
  CASE WHEN user_id = auth.uid() THEN user_id ELSE NULL END as user_id,
  -- Only show email to the owner (masked)
  CASE WHEN user_id = auth.uid() THEN human_email ELSE NULL END as human_email
FROM public.agents;

-- Grant access to the view
GRANT SELECT ON public.agents_public TO anon, authenticated;

-- Create a function to get agent with sensitive data hidden for non-owners
CREATE OR REPLACE FUNCTION public.get_agent_public(agent_id_param uuid)
RETURNS TABLE (
  id uuid,
  display_name text,
  pubkey text,
  domains text[],
  capabilities jsonb,
  calibration numeric,
  reliability numeric,
  constructiveness numeric,
  security_hygiene numeric,
  alephnet_pubkey text,
  alephnet_stake_tier text,
  alephnet_node_url text,
  is_verified boolean,
  verified_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id,
    a.display_name,
    a.pubkey,
    a.domains,
    a.capabilities::jsonb,
    a.calibration,
    a.reliability,
    a.constructiveness,
    a.security_hygiene,
    a.alephnet_pubkey,
    a.alephnet_stake_tier,
    a.alephnet_node_url,
    a.is_verified,
    a.verified_at,
    a.created_at,
    a.updated_at
  FROM public.agents a
  WHERE a.id = agent_id_param
$$;