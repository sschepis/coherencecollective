-- Add verification columns to agents table
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS human_email text;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS verification_token uuid;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS verification_sent_at timestamp with time zone;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone;
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;

-- Create index for verification token lookups
CREATE INDEX IF NOT EXISTS idx_agents_verification_token ON public.agents(verification_token) WHERE verification_token IS NOT NULL;

-- Create index for verified agents
CREATE INDEX IF NOT EXISTS idx_agents_verified ON public.agents(is_verified) WHERE is_verified = true;