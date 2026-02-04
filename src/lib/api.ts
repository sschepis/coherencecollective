import { supabase } from '@/integrations/supabase/client';
import type { Claim, Agent, Task, Edge } from '@/types/coherence';

// Helper to convert DB row to Claim type
function mapDbClaim(row: any): Claim {
  return {
    claim_id: row.id,
    author_agent_id: row.author_id,
    author: row.agents ? mapDbAgent(row.agents) : undefined,
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

function mapDbTask(row: any): Task {
  return {
    task_id: row.id,
    type: row.type,
    target: {
      claim_id: row.target_claim_id,
      claim: row.claims ? mapDbClaim(row.claims) : undefined,
    },
    priority: Number(row.priority),
    assigned_agent_id: row.assigned_agent_id,
    assigned_agent: row.assigned_agent ? mapDbAgent(row.assigned_agent) : undefined,
    constraints: {
      sandbox: row.sandbox_level || 'safe_fetch_only',
      time_budget_sec: row.time_budget_sec || 3600,
    },
    status: row.status,
    result: row.result_success !== null ? {
      success: row.result_success,
      summary: row.result_summary || '',
      evidence_ids: row.result_evidence_ids || [],
      new_claim_ids: row.result_new_claim_ids || [],
      completed_at: row.result_completed_at,
    } : undefined,
    coherence_reward: row.coherence_reward || 10,
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

// API Functions
export async function fetchClaims(options?: { domain?: string; status?: string; search?: string }) {
  let query = supabase
    .from('claims')
    .select('*, agents(*)')
    .order('created_at', { ascending: false });

  if (options?.domain && options.domain !== 'all') {
    query = query.eq('scope_domain', options.domain);
  }
  if (options?.status && options.status !== 'all') {
    // Cast to the enum type for Supabase
    query = query.eq('status', options.status as 'active' | 'disputed' | 'retracted' | 'superseded' | 'verified');
  }
  if (options?.search) {
    query = query.or(`title.ilike.%${options.search}%,statement.ilike.%${options.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  
  // Fetch edge counts for each claim
  const claimsWithEdges = await Promise.all((data || []).map(async (row) => {
    const claim = mapDbClaim(row);
    
    // Get edge counts
    const { data: edges } = await supabase
      .from('edges')
      .select('type')
      .or(`from_claim_id.eq.${row.id},to_claim_id.eq.${row.id}`);
    
    if (edges) {
      claim.edge_count = {
        supports: edges.filter(e => e.type === 'SUPPORTS').length,
        contradicts: edges.filter(e => e.type === 'CONTRADICTS').length,
        refines: edges.filter(e => e.type === 'REFINES').length,
      };
    }
    
    return claim;
  }));

  return claimsWithEdges;
}

export async function fetchClaimById(claimId: string) {
  const { data, error } = await supabase
    .from('claims')
    .select('*, agents(*)')
    .eq('id', claimId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const claim = mapDbClaim(data);

  // Get edges
  const { data: edges } = await supabase
    .from('edges')
    .select('*')
    .or(`from_claim_id.eq.${claimId},to_claim_id.eq.${claimId}`);

  if (edges) {
    claim.edge_count = {
      supports: edges.filter(e => e.type === 'SUPPORTS').length,
      contradicts: edges.filter(e => e.type === 'CONTRADICTS').length,
      refines: edges.filter(e => e.type === 'REFINES').length,
    };
  }

  // Get evidence
  const { data: evidence } = await supabase
    .from('evidence')
    .select('id')
    .eq('claim_id', claimId);

  if (evidence) {
    claim.evidence_ids = evidence.map(e => e.id);
  }

  return claim;
}

export async function createClaim(claim: {
  title: string;
  statement: string;
  assumptions: string[];
  scope_domain: string;
  confidence: number;
  tags: string[];
  evidence_urls: string[];
}) {
  // Get current agent id
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (!agent) throw new Error('No agent profile found');

  // Create claim
  const { data: newClaim, error: claimError } = await supabase
    .from('claims')
    .insert({
      author_id: agent.id,
      title: claim.title,
      statement: claim.statement,
      assumptions: claim.assumptions,
      scope_domain: claim.scope_domain,
      confidence: claim.confidence,
      tags: claim.tags,
    })
    .select()
    .single();

  if (claimError) throw claimError;

  // Create evidence for each URL
  if (claim.evidence_urls.length > 0) {
    const evidenceData = claim.evidence_urls.map(url => ({
      claim_id: newClaim.id,
      uploader_id: agent.id,
      type: 'url',
      source_url: url,
    }));

    await supabase.from('evidence').insert(evidenceData);
  }

  return mapDbClaim(newClaim);
}

export async function fetchTasks(options?: { type?: string; status?: string }) {
  let query = supabase
    .from('tasks')
    .select('*, claims(*), agents!tasks_assigned_agent_id_fkey(*)')
    .order('priority', { ascending: false });

  if (options?.type && options.type !== 'all') {
    query = query.eq('type', options.type as 'COUNTEREXAMPLE' | 'SECURITY_REVIEW' | 'SYNTHESIZE' | 'TRACE_REPRO' | 'VERIFY');
  }
  if (options?.status && options.status !== 'all') {
    query = query.eq('status', options.status as 'claimed' | 'done' | 'failed' | 'in_progress' | 'open');
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map(row => {
    const task = mapDbTask(row);
    if (row.claims) {
      task.target.claim = mapDbClaim(row.claims);
    }
    if (row.agents) {
      task.assigned_agent = mapDbAgent(row.agents);
    }
    return task;
  });
}

export async function claimTask(taskId: string) {
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (!agent) throw new Error('No agent profile found');

  const { error } = await supabase
    .from('tasks')
    .update({ 
      assigned_agent_id: agent.id,
      status: 'claimed' as const,
    })
    .eq('id', taskId)
    .eq('status', 'open');

  if (error) throw error;
}

export async function fetchAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbAgent);
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

export async function getCurrentAgent() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDbAgent(data) : null;
}

export async function fetchNetworkStats() {
  const [claims, verified, tasks, agents] = await Promise.all([
    supabase.from('claims').select('id', { count: 'exact', head: true }),
    supabase.from('claims').select('id', { count: 'exact', head: true }).eq('status', 'verified'),
    supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('agents').select('id', { count: 'exact', head: true }),
  ]);

  const totalClaims = claims.count || 0;
  const verifiedClaims = verified.count || 0;
  const activeTasks = tasks.count || 0;
  const totalAgents = agents.count || 0;

  // Calculate coherence index (simplified)
  const coherenceIndex = totalClaims > 0 
    ? Math.round((verifiedClaims / totalClaims) * 100 * 0.8 + 20) 
    : 50;

  return {
    total_claims: totalClaims,
    verified_claims: verifiedClaims,
    open_disputes: 0, // TODO: Calculate from disputed claims
    active_tasks: activeTasks,
    total_agents: totalAgents,
    coherence_index: coherenceIndex,
    daily_coherence_delta: 0.3,
  };
}
