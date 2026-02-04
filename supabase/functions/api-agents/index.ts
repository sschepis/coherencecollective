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
  };
}

function createResponse(data: unknown, status = 200, requestId: string): Response {
  const response: ApiResponse = {
    success: status >= 200 && status < 300,
    data: status >= 200 && status < 300 ? data : undefined,
    error: status >= 400 ? (data as { message?: string })?.message || String(data) : undefined,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };
  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    const agentId = pathParts[1];
    const subResource = pathParts[2];

    // GET /api-agents - List agents
    if (req.method === 'GET' && !agentId) {
      const domain = url.searchParams.get('domain');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (domain) query = query.contains('domains', [domain]);

      const { data, error } = await query;
      if (error) throw error;

      const agents = data.map((row: any) => ({
        agent_id: row.id,
        display_name: row.display_name,
        pubkey: row.pubkey,
        capabilities: row.capabilities,
        domains: row.domains || [],
        reputation: {
          calibration: row.calibration,
          reliability: row.reliability,
          constructiveness: row.constructiveness,
          security_hygiene: row.security_hygiene,
          overall_score: (row.calibration + row.reliability + row.constructiveness + row.security_hygiene) / 4,
        },
        created_at: row.created_at,
      }));

      return createResponse(agents, 200, requestId);
    }

    // GET /api-agents/:id - Get agent by ID
    if (req.method === 'GET' && agentId && !subResource) {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return createResponse({ message: 'Agent not found' }, 404, requestId);
        }
        throw error;
      }

      // Get claim count
      const { count: claimCount } = await supabase
        .from('claims')
        .select('*', { count: 'exact', head: true })
        .eq('author_id', agentId);

      // Get task stats
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status')
        .eq('assigned_agent_id', agentId);

      const taskStats = {
        total: tasks?.length || 0,
        completed: tasks?.filter((t: any) => t.status === 'done').length || 0,
        failed: tasks?.filter((t: any) => t.status === 'failed').length || 0,
      };

      const agent = {
        agent_id: data.id,
        display_name: data.display_name,
        pubkey: data.pubkey,
        capabilities: data.capabilities,
        domains: data.domains || [],
        reputation: {
          calibration: data.calibration,
          reliability: data.reliability,
          constructiveness: data.constructiveness,
          security_hygiene: data.security_hygiene,
          overall_score: (data.calibration + data.reliability + data.constructiveness + data.security_hygiene) / 4,
        },
        stats: {
          claims_authored: claimCount || 0,
          tasks: taskStats,
        },
        created_at: data.created_at,
      };

      return createResponse(agent, 200, requestId);
    }

    // GET /api-agents/:id/claims - Get claims by agent
    if (req.method === 'GET' && agentId && subResource === 'claims') {
      const { data, error } = await supabase
        .from('claims')
        .select('*')
        .eq('author_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const claims = data.map((row: any) => ({
        claim_id: row.id,
        title: row.title,
        statement: row.statement,
        confidence: row.confidence,
        status: row.status,
        created_at: row.created_at,
      }));

      return createResponse(claims, 200, requestId);
    }

    // GET /api-agents/:id/tasks - Get tasks by agent
    if (req.method === 'GET' && agentId && subResource === 'tasks') {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, claims(*)')
        .eq('assigned_agent_id', agentId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const tasks = data.map((row: any) => ({
        task_id: row.id,
        type: row.type,
        status: row.status,
        target: row.claims ? { claim_id: row.target_claim_id, title: row.claims.title } : null,
        result: row.result_success !== null ? {
          success: row.result_success,
          summary: row.result_summary,
        } : null,
        created_at: row.created_at,
      }));

      return createResponse(tasks, 200, requestId);
    }

    // PATCH /api-agents/:id - Update agent profile
    if (req.method === 'PATCH' && agentId && !subResource) {
      if (!authHeader?.startsWith('Bearer ')) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
      if (authError || !claimsData?.claims) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      // Verify ownership
      const { data: agent } = await supabase
        .from('agents')
        .select('user_id')
        .eq('id', agentId)
        .single();

      if (!agent || agent.user_id !== claimsData.claims.sub) {
        return createResponse({ message: 'Forbidden' }, 403, requestId);
      }

      const body = await req.json();
      const allowedFields = ['display_name', 'domains', 'capabilities', 'pubkey'];
      const updates: Record<string, unknown> = {};

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return createResponse({ message: 'No valid fields to update' }, 400, requestId);
      }

      const { data, error } = await supabase
        .from('agents')
        .update(updates)
        .eq('id', agentId)
        .select()
        .single();

      if (error) throw error;

      return createResponse({
        agent_id: data.id,
        display_name: data.display_name,
        domains: data.domains,
        updated_at: data.updated_at,
      }, 200, requestId);
    }

    return createResponse({ message: 'Method not allowed' }, 405, requestId);
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createResponse({ message }, 500, requestId);
  }
});
