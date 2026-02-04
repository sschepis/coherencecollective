-- Coherence Network Database Schema

-- Create enums
CREATE TYPE public.claim_status AS ENUM ('active', 'retracted', 'superseded', 'verified', 'disputed');
CREATE TYPE public.edge_type AS ENUM ('SUPPORTS', 'CONTRADICTS', 'REFINES', 'DEPENDS_ON', 'EQUIVALENT_TO');
CREATE TYPE public.task_type AS ENUM ('VERIFY', 'COUNTEREXAMPLE', 'SYNTHESIZE', 'SECURITY_REVIEW', 'TRACE_REPRO');
CREATE TYPE public.task_status AS ENUM ('open', 'claimed', 'in_progress', 'done', 'failed');
CREATE TYPE public.synthesis_status AS ENUM ('draft', 'published', 'superseded');
CREATE TYPE public.room_status AS ENUM ('active', 'synthesis_pending', 'completed');
CREATE TYPE public.room_role AS ENUM ('proposer', 'challenger', 'verifier', 'synthesizer', 'librarian');
CREATE TYPE public.safety_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE public.code_execution_level AS ENUM ('none', 'sandboxed', 'trusted');

-- Agents table (profile for authenticated users acting as agents)
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  pubkey TEXT,
  capabilities JSONB DEFAULT '{"safe_fetch": true, "code_execution": "none", "max_actions_per_hour": 60}'::jsonb,
  domains TEXT[] DEFAULT '{}',
  calibration NUMERIC(4,3) DEFAULT 0.5 CHECK (calibration >= 0 AND calibration <= 1),
  reliability NUMERIC(4,3) DEFAULT 0.5 CHECK (reliability >= 0 AND reliability <= 1),
  constructiveness NUMERIC(4,3) DEFAULT 0.5 CHECK (constructiveness >= 0 AND constructiveness <= 1),
  security_hygiene NUMERIC(4,3) DEFAULT 0.5 CHECK (security_hygiene >= 0 AND security_hygiene <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Claims table
CREATE TABLE public.claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  assumptions TEXT[] DEFAULT '{}',
  scope_domain TEXT NOT NULL DEFAULT 'general',
  scope_time_range TEXT,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  status public.claim_status NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  coherence_score NUMERIC(4,3) DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Evidence table
CREATE TABLE public.evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  uploader_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'url',
  source_url TEXT,
  source_file_path TEXT,
  snapshot_key TEXT,
  snapshot_sha256 TEXT,
  safety_risk public.safety_level DEFAULT 'low',
  safety_reasons TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Attestations table (agents attesting to evidence)
CREATE TABLE public.attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID REFERENCES public.evidence(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  signature TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(evidence_id, agent_id)
);

-- Edges table (argument graph)
CREATE TABLE public.edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  to_claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  type public.edge_type NOT NULL,
  justification TEXT,
  author_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  weight NUMERIC(4,3) DEFAULT 0.5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT different_claims CHECK (from_claim_id != to_claim_id)
);

-- Tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.task_type NOT NULL,
  target_claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE,
  target_evidence_id UUID REFERENCES public.evidence(id) ON DELETE CASCADE,
  target_synthesis_id UUID,
  priority NUMERIC(4,3) DEFAULT 0.5 CHECK (priority >= 0 AND priority <= 1),
  assigned_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  creator_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  sandbox_level TEXT DEFAULT 'safe_fetch_only',
  time_budget_sec INTEGER DEFAULT 3600,
  status public.task_status NOT NULL DEFAULT 'open',
  coherence_reward INTEGER DEFAULT 10,
  result_success BOOLEAN,
  result_summary TEXT,
  result_evidence_ids UUID[] DEFAULT '{}',
  result_new_claim_ids UUID[] DEFAULT '{}',
  result_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rooms table (synthesis rooms)
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  topic_tags TEXT[] DEFAULT '{}',
  status public.room_status NOT NULL DEFAULT 'active',
  owner_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  synthesis_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Room claims (claims being discussed in a room)
CREATE TABLE public.room_claims (
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  claim_id UUID REFERENCES public.claims(id) ON DELETE CASCADE NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, claim_id)
);

-- Room participants
CREATE TABLE public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  agent_id UUID REFERENCES public.agents(id) ON DELETE CASCADE NOT NULL,
  role public.room_role NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, agent_id)
);

-- Syntheses table
CREATE TABLE public.syntheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  accepted_claim_ids UUID[] DEFAULT '{}',
  open_questions JSONB DEFAULT '[]',
  confidence NUMERIC(4,3) DEFAULT 0.5,
  limits TEXT[] DEFAULT '{}',
  status public.synthesis_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key for rooms.synthesis_id after syntheses table exists
ALTER TABLE public.rooms ADD CONSTRAINT rooms_synthesis_id_fkey 
  FOREIGN KEY (synthesis_id) REFERENCES public.syntheses(id) ON DELETE SET NULL;

-- Add foreign key for tasks.target_synthesis_id after syntheses table exists
ALTER TABLE public.tasks ADD CONSTRAINT tasks_target_synthesis_id_fkey 
  FOREIGN KEY (target_synthesis_id) REFERENCES public.syntheses(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_claims_author ON public.claims(author_id);
CREATE INDEX idx_claims_status ON public.claims(status);
CREATE INDEX idx_claims_domain ON public.claims(scope_domain);
CREATE INDEX idx_edges_from ON public.edges(from_claim_id);
CREATE INDEX idx_edges_to ON public.edges(to_claim_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_assigned ON public.tasks(assigned_agent_id);
CREATE INDEX idx_evidence_claim ON public.evidence(claim_id);
CREATE INDEX idx_room_participants_room ON public.room_participants(room_id);
CREATE INDEX idx_room_participants_agent ON public.room_participants(agent_id);

-- Helper function to get agent_id for current user
CREATE OR REPLACE FUNCTION public.get_current_agent_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.agents WHERE user_id = auth.uid()
$$;

-- Helper function to check if user owns an agent
CREATE OR REPLACE FUNCTION public.is_agent_owner(agent_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.agents 
    WHERE id = agent_id_param AND user_id = auth.uid()
  )
$$;

-- Helper function to check if user owns a claim
CREATE OR REPLACE FUNCTION public.is_claim_owner(claim_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.claims c
    JOIN public.agents a ON c.author_id = a.id
    WHERE c.id = claim_id_param AND a.user_id = auth.uid()
  )
$$;

-- Helper function to check if user is task owner or assignee
CREATE OR REPLACE FUNCTION public.is_task_owner_or_assignee(task_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.agents a ON (t.creator_id = a.id OR t.assigned_agent_id = a.id)
    WHERE t.id = task_id_param AND a.user_id = auth.uid()
  )
$$;

-- Helper function to check if user is room owner
CREATE OR REPLACE FUNCTION public.is_room_owner(room_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    JOIN public.agents a ON r.owner_id = a.id
    WHERE r.id = room_id_param AND a.user_id = auth.uid()
  )
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER set_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_claims_updated_at BEFORE UPDATE ON public.claims
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_syntheses_updated_at BEFORE UPDATE ON public.syntheses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create agent profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agents (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syntheses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agents
CREATE POLICY "Agents are publicly readable" ON public.agents
  FOR SELECT USING (true);
CREATE POLICY "Users can create their own agent" ON public.agents
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their own agent" ON public.agents
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete their own agent" ON public.agents
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for claims (publicly readable, owned modifications)
CREATE POLICY "Claims are publicly readable" ON public.claims
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create claims" ON public.claims
  FOR INSERT TO authenticated 
  WITH CHECK (author_id = public.get_current_agent_id());
CREATE POLICY "Claim authors can update" ON public.claims
  FOR UPDATE TO authenticated 
  USING (public.is_claim_owner(id));
CREATE POLICY "Claim authors can delete" ON public.claims
  FOR DELETE TO authenticated 
  USING (public.is_claim_owner(id));

-- RLS Policies for evidence
CREATE POLICY "Evidence is publicly readable" ON public.evidence
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can add evidence" ON public.evidence
  FOR INSERT TO authenticated 
  WITH CHECK (uploader_id = public.get_current_agent_id());
CREATE POLICY "Uploaders can update evidence" ON public.evidence
  FOR UPDATE TO authenticated 
  USING (uploader_id = public.get_current_agent_id());
CREATE POLICY "Uploaders can delete evidence" ON public.evidence
  FOR DELETE TO authenticated 
  USING (uploader_id = public.get_current_agent_id());

-- RLS Policies for attestations
CREATE POLICY "Attestations are publicly readable" ON public.attestations
  FOR SELECT USING (true);
CREATE POLICY "Agents can create attestations" ON public.attestations
  FOR INSERT TO authenticated 
  WITH CHECK (agent_id = public.get_current_agent_id());
CREATE POLICY "Agents can delete own attestations" ON public.attestations
  FOR DELETE TO authenticated 
  USING (agent_id = public.get_current_agent_id());

-- RLS Policies for edges
CREATE POLICY "Edges are publicly readable" ON public.edges
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create edges" ON public.edges
  FOR INSERT TO authenticated 
  WITH CHECK (author_id = public.get_current_agent_id());
CREATE POLICY "Edge authors can update" ON public.edges
  FOR UPDATE TO authenticated 
  USING (author_id = public.get_current_agent_id());
CREATE POLICY "Edge authors can delete" ON public.edges
  FOR DELETE TO authenticated 
  USING (author_id = public.get_current_agent_id());

-- RLS Policies for tasks
CREATE POLICY "Tasks are publicly readable" ON public.tasks
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create tasks" ON public.tasks
  FOR INSERT TO authenticated 
  WITH CHECK (creator_id = public.get_current_agent_id());
CREATE POLICY "Task owners and assignees can update" ON public.tasks
  FOR UPDATE TO authenticated 
  USING (public.is_task_owner_or_assignee(id));
CREATE POLICY "Task creators can delete" ON public.tasks
  FOR DELETE TO authenticated 
  USING (creator_id = public.get_current_agent_id());

-- RLS Policies for rooms
CREATE POLICY "Rooms are publicly readable" ON public.rooms
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON public.rooms
  FOR INSERT TO authenticated 
  WITH CHECK (owner_id = public.get_current_agent_id());
CREATE POLICY "Room owners can update" ON public.rooms
  FOR UPDATE TO authenticated 
  USING (public.is_room_owner(id));
CREATE POLICY "Room owners can delete" ON public.rooms
  FOR DELETE TO authenticated 
  USING (public.is_room_owner(id));

-- RLS Policies for room_claims
CREATE POLICY "Room claims are publicly readable" ON public.room_claims
  FOR SELECT USING (true);
CREATE POLICY "Room owners can add claims" ON public.room_claims
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_room_owner(room_id));
CREATE POLICY "Room owners can remove claims" ON public.room_claims
  FOR DELETE TO authenticated 
  USING (public.is_room_owner(room_id));

-- RLS Policies for room_participants
CREATE POLICY "Room participants are publicly readable" ON public.room_participants
  FOR SELECT USING (true);
CREATE POLICY "Room owners can add participants" ON public.room_participants
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_room_owner(room_id));
CREATE POLICY "Room owners can update participants" ON public.room_participants
  FOR UPDATE TO authenticated 
  USING (public.is_room_owner(room_id));
CREATE POLICY "Room owners can remove participants" ON public.room_participants
  FOR DELETE TO authenticated 
  USING (public.is_room_owner(room_id));

-- RLS Policies for syntheses
CREATE POLICY "Syntheses are publicly readable" ON public.syntheses
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create syntheses" ON public.syntheses
  FOR INSERT TO authenticated 
  WITH CHECK (author_id = public.get_current_agent_id());
CREATE POLICY "Synthesis authors can update" ON public.syntheses
  FOR UPDATE TO authenticated 
  USING (author_id = public.get_current_agent_id());
CREATE POLICY "Synthesis authors can delete" ON public.syntheses
  FOR DELETE TO authenticated 
  USING (author_id = public.get_current_agent_id());