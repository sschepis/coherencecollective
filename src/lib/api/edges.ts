import { supabase } from '@/integrations/supabase/client';
import type { Edge, Claim, Agent } from '@/types/coherence';

function mapDbAgent(row: any): Agent {
  return {
    agent_id: row.id,
    pubkey: row.pubkey || '',
    display_name: row.display_name,
    avatar_url: undefined,
    capabilities: row.capabilities || { safe_fetch: true, code_execution: 'none', max_actions_per_hour: 60 },
    domains: row.domains || [],
    reputation: {
      calibration: Number(row.calibration) || 0.5,
      reliability: Number(row.reliability) || 0.5,
      constructiveness: Number(row.constructiveness) || 0.5,
      security_hygiene: Number(row.security_hygiene) || 0.5,
      overall_score: (Number(row.calibration) + Number(row.reliability) + Number(row.constructiveness) + Number(row.security_hygiene)) / 4 || 0.5,
    },
    created_at: row.created_at,
  };
}

function mapDbClaim(row: any): Claim {
  return {
    claim_id: row.id,
    author_agent_id: row.author_id,
    title: row.title,
    statement: row.statement,
    assumptions: row.assumptions || [],
    scope: {
      domain: row.scope_domain,
      time_range: row.scope_time_range,
      dependencies: [],
    },
    confidence: Number(row.confidence),
    evidence_ids: [],
    tags: row.tags || [],
    status: row.status,
    edge_count: { supports: 0, contradicts: 0, refines: 0 },
    coherence_score: Number(row.coherence_score) || 0.5,
    created_at: row.created_at,
  };
}

function mapDbEdge(row: any): Edge {
  return {
    edge_id: row.id,
    from_claim_id: row.from_claim_id,
    to_claim_id: row.to_claim_id,
    type: row.type,
    justification: row.justification || '',
    author_agent_id: row.author_id,
    weight: Number(row.weight),
    created_at: row.created_at,
  };
}

export async function fetchEdgesForClaim(claimId: string) {
  const { data, error } = await supabase
    .from('edges')
    .select('*, from_claim:claims!edges_from_claim_id_fkey(*), to_claim:claims!edges_to_claim_id_fkey(*), agents(*)')
    .or(`from_claim_id.eq.${claimId},to_claim_id.eq.${claimId}`);

  if (error) throw error;
  return (data || []).map(row => {
    const edge = mapDbEdge(row);
    if (row.from_claim) edge.from_claim = mapDbClaim(row.from_claim);
    if (row.to_claim) edge.to_claim = mapDbClaim(row.to_claim);
    if (row.agents) edge.author = mapDbAgent(row.agents);
    return edge;
  });
}

export async function fetchAllEdges() {
  const { data, error } = await supabase
    .from('edges')
    .select('*, from_claim:claims!edges_from_claim_id_fkey(*), to_claim:claims!edges_to_claim_id_fkey(*)');

  if (error) throw error;
  return (data || []).map(row => {
    const edge = mapDbEdge(row);
    if (row.from_claim) edge.from_claim = mapDbClaim(row.from_claim);
    if (row.to_claim) edge.to_claim = mapDbClaim(row.to_claim);
    return edge;
  });
}

export async function createEdge(edge: {
  from_claim_id: string;
  to_claim_id: string;
  type: Edge['type'];
  justification: string;
  weight?: number;
}) {
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (!agent) throw new Error('No agent profile found');

  const { data, error } = await supabase
    .from('edges')
    .insert({
      from_claim_id: edge.from_claim_id,
      to_claim_id: edge.to_claim_id,
      type: edge.type,
      justification: edge.justification,
      author_id: agent.id,
      weight: edge.weight || 0.5,
    })
    .select()
    .single();

  if (error) throw error;
  return mapDbEdge(data);
}

export async function deleteEdge(edgeId: string) {
  const { error } = await supabase
    .from('edges')
    .delete()
    .eq('id', edgeId);

  if (error) throw error;
}
