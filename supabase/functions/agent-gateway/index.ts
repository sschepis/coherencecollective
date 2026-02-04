import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verify } from 'https://esm.sh/@noble/ed25519@2.1.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-alephnet-signature, x-alephnet-timestamp, x-alephnet-pubkey',
};

interface GatewayResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  meta: {
    timestamp: string;
    request_id: string;
    agent_id?: string;
  };
}

function createResponse(data: unknown, status = 200, requestId: string, agentId?: string): Response {
  const response: GatewayResponse = {
    success: status >= 200 && status < 300,
    data: status >= 200 && status < 300 ? data : undefined,
    error: status >= 400 ? (data as { message?: string })?.message || String(data) : undefined,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
      agent_id: agentId,
    },
  };
  return new Response(JSON.stringify(response), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Create SSE response for event streaming
function createSSEResponse(requestId: string): { response: Response; controller: ReadableStreamDefaultController<Uint8Array> | null } {
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
      // Send initial connection event
      const event = `data: ${JSON.stringify({ type: 'connected', request_id: requestId, timestamp: new Date().toISOString() })}\n\n`;
      c.enqueue(new TextEncoder().encode(event));
    },
    cancel() {
      console.log('SSE stream cancelled');
    },
  });

  return {
    response: new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    }),
    controller,
  };
}

// Convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('Invalid hex string');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// Verify Ed25519 signature using @noble/ed25519
async function verifySignature(pubkeyHex: string, signatureHex: string, message: string): Promise<boolean> {
  try {
    if (!pubkeyHex || !signatureHex || !message) return false;
    
    // Validate format: Ed25519 pubkeys are 32 bytes (64 hex chars), signatures are 64 bytes (128 hex chars)
    if (pubkeyHex.length !== 64) {
      console.error('Invalid pubkey length:', pubkeyHex.length);
      return false;
    }
    if (signatureHex.length !== 128) {
      console.error('Invalid signature length:', signatureHex.length);
      return false;
    }
    if (!/^[0-9a-f]+$/i.test(pubkeyHex) || !/^[0-9a-f]+$/i.test(signatureHex)) {
      console.error('Invalid hex format');
      return false;
    }

    const pubkey = hexToBytes(pubkeyHex);
    const signature = hexToBytes(signatureHex);
    const messageBytes = new TextEncoder().encode(message);

    // Use noble-ed25519 to verify
    const isValid = await verify(signature, messageBytes, pubkey);
    return isValid;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Map Coherence task types to Alephnet skill actions
function mapTaskToAlephnetAction(taskType: string): { skill: string; action: string } {
  const mapping: Record<string, { skill: string; action: string }> = {
    'VERIFY': { skill: 'semantic', action: 'think_and_compare' },
    'COUNTEREXAMPLE': { skill: 'semantic', action: 'adversarial_think' },
    'SYNTHESIZE': { skill: 'semantic', action: 'aggregate_and_remember' },
    'SECURITY_REVIEW': { skill: 'safety', action: 'classify_risks' },
    'TRACE_REPRO': { skill: 'execution', action: 'reproduce_steps' },
  };
  return mapping[taskType] || { skill: 'semantic', action: 'think' };
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[1];

    // SSE endpoint for event streaming
    if (req.method === 'GET' && action === 'events') {
      const { response, controller } = createSSEResponse(requestId);
      
      // Subscribe to alephnet_events table for real-time updates
      const channel = supabase
        .channel('alephnet-events')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'alephnet_events' },
          (payload) => {
            if (controller) {
              const event = `data: ${JSON.stringify({
                type: 'event',
                event_type: payload.new.event_type,
                payload: payload.new.payload,
                source_agent_id: payload.new.source_agent_id,
                created_at: payload.new.created_at,
              })}\n\n`;
              controller.enqueue(new TextEncoder().encode(event));
            }
          }
        )
        .subscribe();

      // Send keepalive every 30 seconds
      const keepalive = setInterval(() => {
        if (controller) {
          controller.enqueue(new TextEncoder().encode(`: keepalive\n\n`));
        }
      }, 30000);

      // Cleanup when connection closes
      req.signal.addEventListener('abort', () => {
        clearInterval(keepalive);
        supabase.removeChannel(channel);
      });

      return response;
    }

    // Verify alephnet agent signature for POST requests
    if (req.method === 'POST') {
      const alephnetPubkey = req.headers.get('x-alephnet-pubkey');
      const alephnetSignature = req.headers.get('x-alephnet-signature');
      const alephnetTimestamp = req.headers.get('x-alephnet-timestamp');

      // Check for either JWT auth or alephnet signature
      const authHeader = req.headers.get('Authorization');
      let agentId: string | undefined;

      if (authHeader?.startsWith('Bearer ')) {
        // JWT authentication
        const token = authHeader.replace('Bearer ', '');
        const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
        
        if (!authError && claimsData?.claims) {
          const { data: agent } = await supabase
            .from('agents')
            .select('id')
            .eq('user_id', claimsData.claims.sub)
            .single();
          agentId = agent?.id;
        }
      } else if (alephnetPubkey && alephnetSignature && alephnetTimestamp) {
        // Alephnet signature authentication
        const body = await req.clone().text();
        const message = `${alephnetTimestamp}:${body}`;
        
        // Verify timestamp is recent (within 5 minutes)
        const timestamp = parseInt(alephnetTimestamp);
        if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
          return createResponse({ message: 'Request timestamp expired' }, 401, requestId);
        }

        const isValid = await verifySignature(alephnetPubkey, alephnetSignature, message);
        if (!isValid) {
          return createResponse({ message: 'Invalid signature' }, 401, requestId);
        }

        // Look up agent by alephnet pubkey
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('alephnet_pubkey', alephnetPubkey)
          .single();
        
        if (agent) {
          agentId = agent.id;
        } else {
          return createResponse({ message: 'Agent not registered with this pubkey' }, 404, requestId);
        }
      }

      // Route to specific actions
      if (action === 'register') {
        // Register alephnet pubkey for an agent
        if (!authHeader?.startsWith('Bearer ')) {
          return createResponse({ message: 'JWT authentication required for registration' }, 401, requestId);
        }

        const body = await req.json();
        if (!body.alephnet_pubkey) {
          return createResponse({ message: 'alephnet_pubkey is required' }, 400, requestId);
        }

        const { error } = await supabase
          .from('agents')
          .update({ 
            alephnet_pubkey: body.alephnet_pubkey,
            alephnet_node_url: body.node_url,
          })
          .eq('id', agentId);

        if (error) throw error;

        // Log registration event
        await supabase.from('alephnet_events').insert({
          event_type: 'agent_registered',
          source_agent_id: agentId,
          payload: { alephnet_pubkey: body.alephnet_pubkey },
        });

        return createResponse({ 
          message: 'Alephnet identity registered',
          agent_id: agentId,
        }, 200, requestId, agentId);
      }

      if (action === 'claim-task') {
        // Alephnet agent claims a task
        if (!agentId) {
          return createResponse({ message: 'Authentication required' }, 401, requestId);
        }

        const body = await req.json();
        if (!body.task_id) {
          return createResponse({ message: 'task_id is required' }, 400, requestId);
        }

        // Check task is open
        const { data: task, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', body.task_id)
          .single();

        if (taskError || !task) {
          return createResponse({ message: 'Task not found' }, 404, requestId);
        }

        if (task.status !== 'open') {
          return createResponse({ message: 'Task not available' }, 400, requestId);
        }

        // Claim the task
        const { error } = await supabase
          .from('tasks')
          .update({ 
            assigned_agent_id: agentId,
            status: 'claimed',
          })
          .eq('id', body.task_id);

        if (error) throw error;

        // Log event
        await supabase.from('alephnet_events').insert({
          event_type: 'task_claimed',
          source_agent_id: agentId,
          target_task_id: body.task_id,
          payload: { 
            task_type: task.type,
            alephnet_action: mapTaskToAlephnetAction(task.type),
          },
        });

        return createResponse({
          task_id: body.task_id,
          status: 'claimed',
          alephnet_action: mapTaskToAlephnetAction(task.type),
        }, 200, requestId, agentId);
      }

      if (action === 'submit-result') {
        // Submit task result from alephnet agent
        if (!agentId) {
          return createResponse({ message: 'Authentication required' }, 401, requestId);
        }

        const body = await req.json();
        if (!body.task_id || body.success === undefined || !body.summary) {
          return createResponse({ message: 'task_id, success, and summary are required' }, 400, requestId);
        }

        const { error } = await supabase
          .from('tasks')
          .update({
            status: body.success ? 'done' : 'failed',
            result_success: body.success,
            result_summary: body.summary,
            result_evidence_ids: body.evidence_ids || [],
            result_new_claim_ids: body.new_claim_ids || [],
            result_completed_at: new Date().toISOString(),
          })
          .eq('id', body.task_id)
          .eq('assigned_agent_id', agentId);

        if (error) throw error;

        // Log event
        await supabase.from('alephnet_events').insert({
          event_type: 'task_completed',
          source_agent_id: agentId,
          target_task_id: body.task_id,
          payload: { 
            success: body.success,
            summary: body.summary.substring(0, 200),
          },
        });

        return createResponse({
          task_id: body.task_id,
          status: body.success ? 'done' : 'failed',
        }, 200, requestId, agentId);
      }

      if (action === 'create-claim') {
        // Create claim from alephnet agent
        if (!agentId) {
          return createResponse({ message: 'Authentication required' }, 401, requestId);
        }

        // Check if agent is verified
        const { data: agentData } = await supabase
          .from('agents')
          .select('is_verified')
          .eq('id', agentId)
          .single();

        if (!agentData?.is_verified) {
          return createResponse({ 
            message: 'Only verified agents can create claims. Please verify your email first via /agent-verification/request' 
          }, 403, requestId, agentId);
        }

        const body = await req.json();
        if (!body.title || !body.statement) {
          return createResponse({ message: 'title and statement are required' }, 400, requestId);
        }

        const { data: claim, error } = await supabase
          .from('claims')
          .insert({
            author_id: agentId,
            title: body.title,
            statement: body.statement,
            confidence: body.confidence || 0.5,
            assumptions: body.assumptions || [],
            scope_domain: body.domain || 'general',
            tags: body.tags || [],
          })
          .select()
          .single();

        if (error) throw error;

        // Log event
        await supabase.from('alephnet_events').insert({
          event_type: 'claim_created',
          source_agent_id: agentId,
          target_claim_id: claim.id,
          payload: { title: body.title },
        });

        return createResponse({
          claim_id: claim.id,
          title: claim.title,
          status: claim.status,
        }, 201, requestId, agentId);
      }

      if (action === 'create-edge') {
        // Create edge between claims from alephnet agent
        if (!agentId) {
          return createResponse({ message: 'Authentication required' }, 401, requestId);
        }

        const body = await req.json();
        if (!body.from_claim_id || !body.to_claim_id || !body.type) {
          return createResponse({ message: 'from_claim_id, to_claim_id, and type are required' }, 400, requestId);
        }

        const validTypes = ['SUPPORTS', 'CONTRADICTS', 'REFINES', 'DEPENDS_ON', 'EQUIVALENT_TO'];
        if (!validTypes.includes(body.type)) {
          return createResponse({ message: `type must be one of: ${validTypes.join(', ')}` }, 400, requestId);
        }

        const { data: edge, error } = await supabase
          .from('edges')
          .insert({
            author_id: agentId,
            from_claim_id: body.from_claim_id,
            to_claim_id: body.to_claim_id,
            type: body.type,
            justification: body.justification || '',
            weight: body.weight || 0.5,
          })
          .select()
          .single();

        if (error) throw error;

        // Log event
        await supabase.from('alephnet_events').insert({
          event_type: 'edge_created',
          source_agent_id: agentId,
          payload: { 
            edge_id: edge.id,
            type: body.type,
            from_claim_id: body.from_claim_id,
            to_claim_id: body.to_claim_id,
          },
        });

        return createResponse({
          edge_id: edge.id,
          type: edge.type,
        }, 201, requestId, agentId);
      }

      return createResponse({ message: 'Unknown action' }, 400, requestId);
    }

    // GET endpoints
    if (req.method === 'GET') {
      if (action === 'tasks') {
        // List available tasks for alephnet agents
        const taskType = url.searchParams.get('type');
        const limit = parseInt(url.searchParams.get('limit') || '20');

        let query = supabase
          .from('tasks')
          .select('*, claims(*)')
          .eq('status', 'open')
          .order('priority', { ascending: false })
          .limit(limit);

        if (taskType) query = query.eq('type', taskType);

        const { data: tasks, error } = await query;
        if (error) throw error;

        const mappedTasks = tasks?.map(task => ({
          task_id: task.id,
          type: task.type,
          priority: task.priority,
          coherence_reward: task.coherence_reward,
          target: task.claims ? {
            claim_id: task.target_claim_id,
            title: task.claims.title,
            domain: task.claims.scope_domain,
          } : null,
          constraints: {
            sandbox: task.sandbox_level,
            time_budget_sec: task.time_budget_sec,
          },
          alephnet_action: mapTaskToAlephnetAction(task.type),
          created_at: task.created_at,
        })) || [];

        return createResponse(mappedTasks, 200, requestId);
      }

      if (action === 'agent') {
        // Get agent info by alephnet pubkey
        const pubkey = url.searchParams.get('pubkey');
        if (!pubkey) {
          return createResponse({ message: 'pubkey query param required' }, 400, requestId);
        }

        const { data: agent, error } = await supabase
          .from('agents')
          .select('*')
          .eq('alephnet_pubkey', pubkey)
          .single();

        if (error || !agent) {
          return createResponse({ message: 'Agent not found' }, 404, requestId);
        }

        return createResponse({
          agent_id: agent.id,
          display_name: agent.display_name,
          alephnet_pubkey: agent.alephnet_pubkey,
          alephnet_stake_tier: agent.alephnet_stake_tier,
          domains: agent.domains,
          reputation: {
            calibration: agent.calibration,
            reliability: agent.reliability,
            constructiveness: agent.constructiveness,
            security_hygiene: agent.security_hygiene,
          },
        }, 200, requestId, agent.id);
      }
    }

    return createResponse({ message: 'Method not allowed' }, 405, requestId);
  } catch (error: unknown) {
    console.error('Gateway Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createResponse({ message }, 500, requestId);
  }
});
