-- Fix: Restrict direct SELECT on agents table to protect sensitive columns
-- The agents_public view will provide public access to non-sensitive columns

-- Drop all existing SELECT policies on agents
DROP POLICY IF EXISTS "Users can view all agents public info" ON public.agents;
DROP POLICY IF EXISTS "Agents are publicly readable" ON public.agents;

-- Create restrictive SELECT policy - users can only see their own agent's full data
CREATE POLICY "Users can only view own agent"
ON public.agents
FOR SELECT
USING (user_id = auth.uid());

-- Drop and recreate the view to ensure it works with restricted base table
-- Using a SECURITY DEFINER function approach instead of view to avoid linter warnings
DROP VIEW IF EXISTS public.agents_public;

-- Create a function to list agents (public data only) - this bypasses RLS safely
CREATE OR REPLACE FUNCTION public.list_agents_public(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
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
  ORDER BY a.created_at DESC
  LIMIT p_limit
  OFFSET p_offset
$$;

-- Grant execute to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.list_agents_public TO anon, authenticated;