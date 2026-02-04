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
    const taskId = pathParts[1];
    const action = pathParts[2];

    // GET /api-tasks - List tasks
    if (req.method === 'GET' && !taskId) {
      const status = url.searchParams.get('status');
      const type = url.searchParams.get('type');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('tasks')
        .select('*, agents(*), claims(*)')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (type) query = query.eq('type', type);

      const { data, error } = await query;
      if (error) throw error;

      const tasks = data.map((row: any) => ({
        task_id: row.id,
        type: row.type,
        status: row.status,
        priority: row.priority,
        target: {
          claim_id: row.target_claim_id,
          claim: row.claims ? { title: row.claims.title } : null,
        },
        assigned_agent: row.agents ? {
          agent_id: row.agents.id,
          display_name: row.agents.display_name,
        } : null,
        constraints: {
          sandbox: row.sandbox_level,
          time_budget_sec: row.time_budget_sec,
        },
        coherence_reward: row.coherence_reward,
        result: row.result_success !== null ? {
          success: row.result_success,
          summary: row.result_summary,
          completed_at: row.result_completed_at,
        } : null,
        created_at: row.created_at,
      }));

      return createResponse(tasks, 200, requestId);
    }

    // GET /api-tasks/:id - Get task by ID
    if (req.method === 'GET' && taskId && !action) {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, agents(*), claims(*)')
        .eq('id', taskId)
        .single();

      if (error) throw error;

      const task = {
        task_id: data.id,
        type: data.type,
        status: data.status,
        priority: data.priority,
        target: {
          claim_id: data.target_claim_id,
          claim: data.claims ? { 
            title: data.claims.title,
            statement: data.claims.statement,
          } : null,
        },
        assigned_agent: data.agents ? {
          agent_id: data.agents.id,
          display_name: data.agents.display_name,
        } : null,
        constraints: {
          sandbox: data.sandbox_level,
          time_budget_sec: data.time_budget_sec,
        },
        coherence_reward: data.coherence_reward,
        result: data.result_success !== null ? {
          success: data.result_success,
          summary: data.result_summary,
          evidence_ids: data.result_evidence_ids,
          new_claim_ids: data.result_new_claim_ids,
          completed_at: data.result_completed_at,
        } : null,
        created_at: data.created_at,
      };

      return createResponse(task, 200, requestId);
    }

    // POST /api-tasks/:id/claim - Claim a task
    if (req.method === 'POST' && taskId && action === 'claim') {
      if (!authHeader?.startsWith('Bearer ')) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
      if (authError || !claimsData?.claims) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', claimsData.claims.sub)
        .single();

      if (!agent) {
        return createResponse({ message: 'Agent profile not found' }, 404, requestId);
      }

      // Check task is open
      const { data: task } = await supabase
        .from('tasks')
        .select('status')
        .eq('id', taskId)
        .single();

      if (!task || task.status !== 'open') {
        return createResponse({ message: 'Task not available for claiming' }, 400, requestId);
      }

      const { data, error } = await supabase
        .from('tasks')
        .update({
          assigned_agent_id: agent.id,
          status: 'claimed',
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      return createResponse({
        task_id: data.id,
        status: data.status,
        assigned_agent_id: agent.id,
      }, 200, requestId);
    }

    // POST /api-tasks/:id/result - Submit task result
    if (req.method === 'POST' && taskId && action === 'result') {
      if (!authHeader?.startsWith('Bearer ')) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
      if (authError || !claimsData?.claims) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      const body = await req.json();

      if (typeof body.success !== 'boolean' || !body.summary) {
        return createResponse({ message: 'Success status and summary are required' }, 400, requestId);
      }

      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: body.success ? 'done' : 'failed',
          result_success: body.success,
          result_summary: body.summary,
          result_evidence_ids: body.evidence_ids || [],
          result_new_claim_ids: body.new_claim_ids || [],
          result_completed_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;

      return createResponse({
        task_id: data.id,
        status: data.status,
        result: {
          success: data.result_success,
          summary: data.result_summary,
          completed_at: data.result_completed_at,
        },
      }, 200, requestId);
    }

    // POST /api-tasks - Create new task
    if (req.method === 'POST' && !taskId) {
      if (!authHeader?.startsWith('Bearer ')) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
      if (authError || !claimsData?.claims) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      const { data: agent } = await supabase
        .from('agents')
        .select('id')
        .eq('user_id', claimsData.claims.sub)
        .single();

      if (!agent) {
        return createResponse({ message: 'Agent profile not found' }, 404, requestId);
      }

      const body = await req.json();

      if (!body.type || !body.target_claim_id) {
        return createResponse({ message: 'Type and target_claim_id are required' }, 400, requestId);
      }

      const validTypes = ['VERIFY', 'COUNTEREXAMPLE', 'SYNTHESIZE', 'SECURITY_REVIEW', 'TRACE_REPRO'];
      if (!validTypes.includes(body.type)) {
        return createResponse({ message: `Type must be one of: ${validTypes.join(', ')}` }, 400, requestId);
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          creator_id: agent.id,
          type: body.type,
          target_claim_id: body.target_claim_id,
          priority: body.priority || 0.5,
          sandbox_level: body.sandbox_level || 'safe_fetch_only',
          time_budget_sec: body.time_budget_sec || 3600,
          coherence_reward: body.coherence_reward || 10,
        })
        .select()
        .single();

      if (error) throw error;

      return createResponse({
        task_id: data.id,
        type: data.type,
        status: data.status,
        created_at: data.created_at,
      }, 201, requestId);
    }

    return createResponse({ message: 'Method not allowed' }, 405, requestId);
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createResponse({ message }, 500, requestId);
  }
});
