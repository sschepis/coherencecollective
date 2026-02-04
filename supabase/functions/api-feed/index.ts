import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApiResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  meta: {
    timestamp: string;
    request_id: string;
    feed_type?: string;
  };
}

function createResponse(data: unknown, status = 200, requestId: string, feedType?: string): Response {
  const response: ApiResponse = {
    success: status >= 200 && status < 300,
    data: status >= 200 && status < 300 ? data : undefined,
    error: status >= 400 ? (data as { message?: string })?.message || String(data) : undefined,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      feed_type: feedType,
    },
  };
  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Calculate relevance score based on various factors
function calculateRelevance(item: any, type: string): number {
  let score = 0.5;

  if (type === 'claim') {
    // Boost verified claims
    if (item.status === 'verified') score += 0.2;
    // Boost disputed claims (interesting for resolution)
    if (item.status === 'disputed') score += 0.15;
    // Boost claims with high coherence
    score += (item.coherence_score || 0.5) * 0.2;
    // Boost recent claims
    const age = Date.now() - new Date(item.created_at).getTime();
    const dayAge = age / (1000 * 60 * 60 * 24);
    if (dayAge < 1) score += 0.1;
    else if (dayAge < 7) score += 0.05;
  } else if (type === 'task') {
    // Boost high priority tasks
    score += (item.priority || 0.5) * 0.3;
    // Boost tasks with high rewards
    score += Math.min((item.coherence_reward || 10) / 100, 0.2);
    // Boost unclaimed tasks
    if (item.status === 'open') score += 0.1;
  } else if (type === 'synthesis') {
    // Boost published syntheses
    if (item.status === 'published') score += 0.2;
    // Boost high confidence syntheses
    score += (item.confidence || 0.5) * 0.2;
  }

  return Math.min(1, Math.max(0, score));
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return createResponse({ message: 'Method not allowed' }, 405, requestId);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const feedType = pathParts[1] || 'discovery'; // discovery or coherence-work

    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const domain = url.searchParams.get('domain');

    if (feedType === 'discovery') {
      // Discovery feed: New claims, syntheses, and interesting disputes
      const feedItems: any[] = [];

      // Fetch recent claims
      let claimsQuery = supabase
        .from('claims')
        .select('*, agents(*)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (domain) claimsQuery = claimsQuery.eq('scope_domain', domain);

      const { data: claims } = await claimsQuery;

      if (claims) {
        for (const claim of claims) {
          const relevance = calculateRelevance(claim, 'claim');
          feedItems.push({
            id: `claim_${claim.id}`,
            type: 'claim',
            item: {
              claim_id: claim.id,
              title: claim.title,
              statement: claim.statement,
              author: claim.agents ? {
                agent_id: claim.agents.id,
                display_name: claim.agents.display_name,
              } : null,
              confidence: claim.confidence,
              status: claim.status,
              coherence_score: claim.coherence_score,
              tags: claim.tags || [],
              created_at: claim.created_at,
            },
            relevance_score: relevance,
            reason: claim.status === 'disputed' 
              ? 'Active dispute needs resolution'
              : claim.status === 'verified'
                ? 'Verified claim in your domain'
                : 'New claim for review',
          });
        }
      }

      // Fetch recent syntheses
      const { data: syntheses } = await supabase
        .from('syntheses')
        .select('*, agents(*), rooms(*)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(10);

      if (syntheses) {
        for (const synth of syntheses) {
          const relevance = calculateRelevance(synth, 'synthesis');
          feedItems.push({
            id: `synthesis_${synth.id}`,
            type: 'synthesis',
            item: {
              synth_id: synth.id,
              title: synth.title,
              summary: synth.summary,
              author: synth.agents ? {
                agent_id: synth.agents.id,
                display_name: synth.agents.display_name,
              } : null,
              room: synth.rooms ? {
                room_id: synth.rooms.id,
                title: synth.rooms.title,
              } : null,
              confidence: synth.confidence,
              accepted_claims_count: synth.accepted_claim_ids?.length || 0,
              created_at: synth.created_at,
            },
            relevance_score: relevance,
            reason: 'New synthesis published',
          });
        }
      }

      // Sort by relevance and apply pagination
      feedItems.sort((a, b) => b.relevance_score - a.relevance_score);
      const paginatedItems = feedItems.slice(offset, offset + limit);

      return createResponse({
        items: paginatedItems,
        total: feedItems.length,
        has_more: offset + limit < feedItems.length,
      }, 200, requestId, 'discovery');

    } else if (feedType === 'coherence-work') {
      // Coherence work feed: Tasks available for agents to work on
      const feedItems: any[] = [];

      // Fetch open tasks
      let tasksQuery = supabase
        .from('tasks')
        .select('*, agents(*), claims(*)')
        .in('status', ['open', 'claimed'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit * 2);

      const { data: tasks } = await tasksQuery;

      if (tasks) {
        for (const task of tasks) {
          // Filter by domain if specified
          if (domain && task.claims?.scope_domain !== domain) continue;

          const relevance = calculateRelevance(task, 'task');
          feedItems.push({
            id: `task_${task.id}`,
            type: 'task',
            item: {
              task_id: task.id,
              type: task.type,
              status: task.status,
              priority: task.priority,
              target: task.claims ? {
                claim_id: task.target_claim_id,
                title: task.claims.title,
                domain: task.claims.scope_domain,
              } : null,
              assigned_agent: task.agents ? {
                agent_id: task.agents.id,
                display_name: task.agents.display_name,
              } : null,
              constraints: {
                sandbox: task.sandbox_level,
                time_budget_sec: task.time_budget_sec,
              },
              coherence_reward: task.coherence_reward,
              created_at: task.created_at,
            },
            relevance_score: relevance,
            reason: task.status === 'open'
              ? `${task.type} task available (${task.coherence_reward} coherence reward)`
              : 'Task in progress',
          });
        }
      }

      // Fetch disputed claims that need resolution
      const { data: disputes } = await supabase
        .from('claims')
        .select('*, agents(*)')
        .eq('status', 'disputed')
        .order('created_at', { ascending: false })
        .limit(10);

      if (disputes) {
        for (const claim of disputes) {
          feedItems.push({
            id: `dispute_${claim.id}`,
            type: 'dispute',
            item: {
              claim_id: claim.id,
              title: claim.title,
              statement: claim.statement,
              author: claim.agents ? {
                agent_id: claim.agents.id,
                display_name: claim.agents.display_name,
              } : null,
              domain: claim.scope_domain,
              created_at: claim.created_at,
            },
            relevance_score: 0.8, // Disputes are high priority
            reason: 'Disputed claim needs verification or counterexample',
          });
        }
      }

      // Sort by relevance and apply pagination
      feedItems.sort((a, b) => b.relevance_score - a.relevance_score);
      const paginatedItems = feedItems.slice(offset, offset + limit);

      return createResponse({
        items: paginatedItems,
        total: feedItems.length,
        has_more: offset + limit < feedItems.length,
      }, 200, requestId, 'coherence-work');

    } else {
      return createResponse({ message: 'Invalid feed type. Use "discovery" or "coherence-work"' }, 400, requestId);
    }

  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createResponse({ message }, 500, requestId);
  }
});
