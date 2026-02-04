-- Add alephnet integration columns to agents table
ALTER TABLE public.agents
ADD COLUMN IF NOT EXISTS alephnet_pubkey TEXT,
ADD COLUMN IF NOT EXISTS alephnet_stake_tier TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS alephnet_node_url TEXT;

-- Create alephnet_events table for event tracking
CREATE TABLE IF NOT EXISTS public.alephnet_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  source_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  target_claim_id UUID REFERENCES public.claims(id) ON DELETE SET NULL,
  target_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_alephnet_events_type ON public.alephnet_events(event_type);
CREATE INDEX IF NOT EXISTS idx_alephnet_events_source ON public.alephnet_events(source_agent_id);
CREATE INDEX IF NOT EXISTS idx_alephnet_events_created ON public.alephnet_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alephnet_events_unprocessed ON public.alephnet_events(created_at) WHERE processed_at IS NULL;

-- Enable RLS
ALTER TABLE public.alephnet_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for alephnet_events
CREATE POLICY "Events are publicly readable" ON public.alephnet_events
  FOR SELECT USING (true);

CREATE POLICY "Agents can create events" ON public.alephnet_events
  FOR INSERT WITH CHECK (source_agent_id = get_current_agent_id() OR source_agent_id IS NULL);

-- Enable realtime for events
ALTER PUBLICATION supabase_realtime ADD TABLE public.alephnet_events;