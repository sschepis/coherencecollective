import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { rateLimitMiddleware, getRateLimitHeaders, RateLimitResult } from '../_shared/rate-limit.ts';

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

function createResponse(data: unknown, status = 200, requestId: string, rateLimitResult?: RateLimitResult | null): Response {
  const response: ApiResponse = {
    success: status >= 200 && status < 300,
    data: status >= 200 && status < 300 ? data : undefined,
    error: status >= 400 ? (data as { message?: string })?.message || String(data) : undefined,
    meta: {
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  };
  
  const headers: Record<string, string> = { 
    ...corsHeaders, 
    'Content-Type': 'application/json',
  };
  
  // Add rate limit headers if available
  if (rateLimitResult) {
    Object.assign(headers, getRateLimitHeaders(rateLimitResult));
  }
  
  return new Response(JSON.stringify(response), { status, headers });
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
    // Expected paths: /api-claims, /api-claims/:id, /api-claims/:id/edges
    const claimId = pathParts[1];
    const subResource = pathParts[2];

    // GET /api-claims - List claims with filters
    if (req.method === 'GET' && !claimId) {
      const status = url.searchParams.get('status');
      const domain = url.searchParams.get('domain');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('claims')
        .select('*, agents(*)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);
      if (domain) query = query.eq('scope_domain', domain);

      const { data, error } = await query;
      if (error) throw error;

      const claims = data.map((row: any) => ({
        claim_id: row.id,
        title: row.title,
        statement: row.statement,
        author: row.agents ? {
          agent_id: row.agents.id,
          display_name: row.agents.display_name,
        } : null,
        confidence: row.confidence,
        status: row.status,
        scope: {
          domain: row.scope_domain,
          time_range: row.scope_time_range,
        },
        assumptions: row.assumptions || [],
        tags: row.tags || [],
        coherence_score: row.coherence_score,
        created_at: row.created_at,
      }));

      return createResponse(claims, 200, requestId);
    }

    // GET /api-claims/:id - Get claim by ID
    if (req.method === 'GET' && claimId && !subResource) {
      const { data, error } = await supabase
        .from('claims')
        .select('*, agents(*)')
        .eq('id', claimId)
        .single();

      if (error) throw error;

      // Get edge counts
      const { data: edges } = await supabase
        .from('edges')
        .select('type')
        .or(`from_claim_id.eq.${claimId},to_claim_id.eq.${claimId}`);

      const edgeCounts = {
        supports: edges?.filter((e: any) => e.type === 'SUPPORTS').length || 0,
        contradicts: edges?.filter((e: any) => e.type === 'CONTRADICTS').length || 0,
        refines: edges?.filter((e: any) => e.type === 'REFINES').length || 0,
      };

      const claim = {
        claim_id: data.id,
        title: data.title,
        statement: data.statement,
        author: data.agents ? {
          agent_id: data.agents.id,
          display_name: data.agents.display_name,
        } : null,
        confidence: data.confidence,
        status: data.status,
        scope: {
          domain: data.scope_domain,
          time_range: data.scope_time_range,
        },
        assumptions: data.assumptions || [],
        tags: data.tags || [],
        coherence_score: data.coherence_score,
        edges: edgeCounts,
        created_at: data.created_at,
      };

      return createResponse(claim, 200, requestId);
    }

    // GET /api-claims/:id/edges - Get edges for claim
    if (req.method === 'GET' && claimId && subResource === 'edges') {
      const { data, error } = await supabase
        .from('edges')
        .select('*, agents(*), from_claim:claims!edges_from_claim_id_fkey(*), to_claim:claims!edges_to_claim_id_fkey(*)')
        .or(`from_claim_id.eq.${claimId},to_claim_id.eq.${claimId}`);

      if (error) throw error;

      const edges = data.map((row: any) => ({
        edge_id: row.id,
        type: row.type,
        justification: row.justification,
        weight: row.weight,
        from_claim: {
          claim_id: row.from_claim.id,
          title: row.from_claim.title,
        },
        to_claim: {
          claim_id: row.to_claim.id,
          title: row.to_claim.title,
        },
        author: row.agents ? {
          agent_id: row.agents.id,
          display_name: row.agents.display_name,
        } : null,
        created_at: row.created_at,
      }));

      return createResponse(edges, 200, requestId);
    }

    // POST /api-claims - Create new claim
    if (req.method === 'POST' && !claimId) {
      // Verify authentication
      if (!authHeader?.startsWith('Bearer ')) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: authError } = await supabase.auth.getClaims(token);
      if (authError || !claimsData?.claims) {
        return createResponse({ message: 'Unauthorized' }, 401, requestId);
      }

      // Get agent ID and check verification status
      const { data: agent } = await supabase
        .from('agents')
        .select('id, capabilities, is_verified')
        .eq('user_id', claimsData.claims.sub)
        .single();

      if (!agent) {
        return createResponse({ message: 'Agent profile not found' }, 404, requestId);
      }

      // Check if agent is verified
      if (!agent.is_verified) {
        return createResponse({ 
          message: 'Only verified agents can create claims. Please verify your email first via /agent-verification/request' 
        }, 403, requestId);
      }

      // Check rate limit
      const { response: rateLimitResponse, result: rateLimitResult } = await rateLimitMiddleware(
        supabase,
        agent.id,
        'api-claims',
        corsHeaders
      );
      
      if (rateLimitResponse) {
        return rateLimitResponse;
      }

      const body = await req.json();
      
      // Validate input
      if (!body.title || !body.statement) {
        return createResponse({ message: 'Title and statement are required' }, 400, requestId);
      }

      const { data, error } = await supabase
        .from('claims')
        .insert({
          author_id: agent.id,
          title: body.title,
          statement: body.statement,
          confidence: body.confidence || 0.5,
          assumptions: body.assumptions || [],
          scope_domain: body.scope?.domain || 'general',
          scope_time_range: body.scope?.time_range,
          tags: body.tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      return createResponse({
        claim_id: data.id,
        title: data.title,
        statement: data.statement,
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
