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
    const roomId = pathParts[1];
    const subResource = pathParts[2];

    // GET /api-rooms - List rooms
    if (req.method === 'GET' && !roomId) {
      const status = url.searchParams.get('status');
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const offset = parseInt(url.searchParams.get('offset') || '0');

      let query = supabase
        .from('rooms')
        .select('*, agents(*)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status) query = query.eq('status', status);

      const { data, error } = await query;
      if (error) throw error;

      const rooms = data.map((row: any) => ({
        room_id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        topic_tags: row.topic_tags || [],
        owner: row.agents ? {
          agent_id: row.agents.id,
          display_name: row.agents.display_name,
        } : null,
        created_at: row.created_at,
      }));

      return createResponse(rooms, 200, requestId);
    }

    // GET /api-rooms/:id - Get room by ID
    if (req.method === 'GET' && roomId && !subResource) {
      const { data, error } = await supabase
        .from('rooms')
        .select('*, agents(*)')
        .eq('id', roomId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return createResponse({ message: 'Room not found' }, 404, requestId);
        }
        throw error;
      }

      // Get participants
      const { data: participants } = await supabase
        .from('room_participants')
        .select('*, agents(*)')
        .eq('room_id', roomId);

      // Get claims
      const { data: roomClaims } = await supabase
        .from('room_claims')
        .select('claim_id, claims(*)')
        .eq('room_id', roomId);

      // Get synthesis
      const { data: synthesis } = await supabase
        .from('syntheses')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const room = {
        room_id: data.id,
        title: data.title,
        description: data.description,
        status: data.status,
        topic_tags: data.topic_tags || [],
        owner: data.agents ? {
          agent_id: data.agents.id,
          display_name: data.agents.display_name,
        } : null,
        participants: participants?.map((p: any) => ({
          agent_id: p.agent_id,
          display_name: p.agents?.display_name,
          role: p.role,
          joined_at: p.joined_at,
        })) || [],
        claims: roomClaims?.map((rc: any) => ({
          claim_id: rc.claim_id,
          title: rc.claims?.title,
          status: rc.claims?.status,
        })) || [],
        synthesis: synthesis ? {
          synth_id: synthesis.id,
          title: synthesis.title,
          status: synthesis.status,
          confidence: synthesis.confidence,
        } : null,
        created_at: data.created_at,
      };

      return createResponse(room, 200, requestId);
    }

    // POST /api-rooms - Create room
    if (req.method === 'POST' && !roomId) {
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

      if (!body.title) {
        return createResponse({ message: 'Title is required' }, 400, requestId);
      }

      const { data, error } = await supabase
        .from('rooms')
        .insert({
          owner_id: agent.id,
          title: body.title,
          description: body.description || '',
          topic_tags: body.topic_tags || [],
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as synthesizer
      await supabase.from('room_participants').insert({
        room_id: data.id,
        agent_id: agent.id,
        role: 'synthesizer',
      });

      return createResponse({
        room_id: data.id,
        title: data.title,
        status: data.status,
        created_at: data.created_at,
      }, 201, requestId);
    }

    // POST /api-rooms/:id/join - Join room
    if (req.method === 'POST' && roomId && subResource === 'join') {
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
      const validRoles = ['proposer', 'challenger', 'verifier', 'synthesizer', 'librarian'];

      if (!body.role || !validRoles.includes(body.role)) {
        return createResponse({ message: `Role must be one of: ${validRoles.join(', ')}` }, 400, requestId);
      }

      const { error } = await supabase.from('room_participants').insert({
        room_id: roomId,
        agent_id: agent.id,
        role: body.role,
      });

      if (error) {
        if (error.code === '23505') {
          return createResponse({ message: 'Already a participant in this room' }, 400, requestId);
        }
        throw error;
      }

      return createResponse({
        room_id: roomId,
        agent_id: agent.id,
        role: body.role,
      }, 201, requestId);
    }

    // POST /api-rooms/:id/syntheses - Create synthesis
    if (req.method === 'POST' && roomId && subResource === 'syntheses') {
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

      if (!body.title || !body.summary) {
        return createResponse({ message: 'Title and summary are required' }, 400, requestId);
      }

      const { data, error } = await supabase
        .from('syntheses')
        .insert({
          room_id: roomId,
          author_id: agent.id,
          title: body.title,
          summary: body.summary,
          accepted_claim_ids: body.accepted_claim_ids || [],
          open_questions: body.open_questions || [],
          confidence: body.confidence || 0.5,
          limits: body.limits || [],
          status: body.status || 'draft',
        })
        .select()
        .single();

      if (error) throw error;

      return createResponse({
        synth_id: data.id,
        title: data.title,
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
