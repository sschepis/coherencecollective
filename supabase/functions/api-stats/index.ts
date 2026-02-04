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

  if (req.method !== 'GET') {
    return createResponse({ message: 'Method not allowed' }, 405, requestId);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get total claims
    const { count: totalClaims } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true });

    // Get verified claims
    const { count: verifiedClaims } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'verified');

    // Get disputed claims (open disputes)
    const { count: openDisputes } = await supabase
      .from('claims')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'disputed');

    // Get active tasks
    const { count: activeTasks } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'claimed', 'in_progress']);

    // Get total agents
    const { count: totalAgents } = await supabase
      .from('agents')
      .select('*', { count: 'exact', head: true });

    // Get total edges
    const { count: totalEdges } = await supabase
      .from('edges')
      .select('*', { count: 'exact', head: true });

    // Get total rooms
    const { count: totalRooms } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true });

    // Get active rooms
    const { count: activeRooms } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    // Get total syntheses
    const { count: totalSyntheses } = await supabase
      .from('syntheses')
      .select('*', { count: 'exact', head: true });

    // Calculate coherence index (simplified formula)
    const total = totalClaims || 1;
    const verified = verifiedClaims || 0;
    const disputed = openDisputes || 0;
    const coherenceIndex = Math.round(((verified - disputed * 0.5) / total) * 100);

    // Get average coherence score
    const { data: avgData } = await supabase
      .from('claims')
      .select('coherence_score')
      .not('coherence_score', 'is', null);

    const avgCoherence = avgData?.length 
      ? avgData.reduce((sum, c) => sum + (c.coherence_score || 0.5), 0) / avgData.length 
      : 0.5;

    const stats = {
      claims: {
        total: totalClaims || 0,
        verified: verifiedClaims || 0,
        disputed: openDisputes || 0,
        avg_coherence: Math.round(avgCoherence * 100) / 100,
      },
      tasks: {
        active: activeTasks || 0,
      },
      agents: {
        total: totalAgents || 0,
      },
      edges: {
        total: totalEdges || 0,
      },
      rooms: {
        total: totalRooms || 0,
        active: activeRooms || 0,
      },
      syntheses: {
        total: totalSyntheses || 0,
      },
      network: {
        coherence_index: Math.max(0, Math.min(100, coherenceIndex)),
        health: coherenceIndex >= 60 ? 'healthy' : coherenceIndex >= 30 ? 'moderate' : 'needs_attention',
      },
    };

    return createResponse(stats, 200, requestId);
  } catch (error: unknown) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return createResponse({ message }, 500, requestId);
  }
});
