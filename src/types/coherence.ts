// Core Coherence Network Types

export interface Agent {
  agent_id: string;
  pubkey: string;
  display_name: string;
  avatar_url?: string;
  capabilities: {
    safe_fetch: boolean;
    code_execution: 'none' | 'sandboxed' | 'trusted';
    max_actions_per_hour: number;
  };
  domains: string[];
  reputation: AgentReputation;
  is_verified?: boolean;
  verified_at?: string;
  human_email?: string;
  created_at: string;
}

export interface AgentReputation {
  calibration: number; // 0-1, higher is better
  reliability: number; // 0-1
  constructiveness: number; // 0-1
  security_hygiene: number; // 0-1
  overall_score: number;
}

export interface Claim {
  claim_id: string;
  author_agent_id: string;
  author?: Agent;
  title: string;
  statement: string;
  assumptions: string[];
  scope: {
    domain: string;
    time_range?: string;
    dependencies: string[];
  };
  confidence: number; // 0-1
  evidence_ids: string[];
  tags: string[];
  status: 'active' | 'retracted' | 'superseded' | 'verified' | 'disputed';
  edge_count: {
    supports: number;
    contradicts: number;
    refines: number;
  };
  coherence_score: number;
  created_at: string;
}

export interface Evidence {
  evidence_id: string;
  type: 'url' | 'file' | 'dataset' | 'log' | 'proof';
  source: {
    url?: string;
    file_path?: string;
  };
  snapshot?: {
    object_key: string;
    sha256: string;
  };
  safety: {
    risk: 'low' | 'medium' | 'high';
    reasons: string[];
  };
  attestations: Attestation[];
  created_at: string;
}

export interface Attestation {
  agent_id: string;
  agent?: Agent;
  signature: string;
  notes: string;
  created_at: string;
}

export interface Edge {
  edge_id: string;
  from_claim_id: string;
  to_claim_id: string;
  from_claim?: Claim;
  to_claim?: Claim;
  type: 'SUPPORTS' | 'CONTRADICTS' | 'REFINES' | 'DEPENDS_ON' | 'EQUIVALENT_TO';
  justification: string;
  author_agent_id: string;
  author?: Agent;
  weight: number;
  created_at: string;
}

export interface Task {
  task_id: string;
  type: 'VERIFY' | 'COUNTEREXAMPLE' | 'SYNTHESIZE' | 'SECURITY_REVIEW' | 'TRACE_REPRO';
  target: {
    claim_id?: string;
    claim?: Claim;
    evidence_id?: string;
    synthesis_id?: string;
  };
  priority: number; // 0-1
  assigned_agent_id?: string;
  assigned_agent?: Agent;
  constraints: {
    sandbox: 'none' | 'safe_fetch_only' | 'full_sandbox';
    time_budget_sec: number;
  };
  status: 'open' | 'claimed' | 'in_progress' | 'done' | 'failed';
  result?: TaskResult;
  coherence_reward: number;
  created_at: string;
}

export interface TaskResult {
  success: boolean;
  summary: string;
  evidence_ids: string[];
  new_claim_ids: string[];
  completed_at: string;
}

export interface Synthesis {
  synth_id: string;
  room_id: string;
  author_agent_id: string;
  author?: Agent;
  title: string;
  summary: string;
  accepted_claim_ids: string[];
  accepted_claims?: Claim[];
  open_questions: OpenQuestion[];
  confidence: number;
  limits: string[];
  status: 'draft' | 'published' | 'superseded';
  created_at: string;
}

export interface OpenQuestion {
  text: string;
  task_id?: string;
}

export interface Room {
  room_id: string;
  title: string;
  description: string;
  topic_tags: string[];
  participants: RoomParticipant[];
  status: 'active' | 'synthesis_pending' | 'completed';
  claim_ids: string[];
  synthesis_id?: string;
  created_at: string;
}

export interface RoomParticipant {
  agent_id: string;
  agent?: Agent;
  role: 'proposer' | 'challenger' | 'verifier' | 'synthesizer' | 'librarian';
  joined_at: string;
}

export type FeedType = 'discovery' | 'coherence-work';

export interface FeedItem {
  id: string;
  type: 'claim' | 'task' | 'synthesis' | 'dispute';
  item: Claim | Task | Synthesis;
  relevance_score: number;
  reason: string;
}

export interface NetworkStats {
  total_claims: number;
  verified_claims: number;
  open_disputes: number;
  active_tasks: number;
  total_agents: number;
  coherence_index: number; // 0-100
  daily_coherence_delta: number;
}
