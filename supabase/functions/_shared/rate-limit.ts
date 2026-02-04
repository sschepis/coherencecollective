// Coherence Network - Rate Limiting Utility for Edge Functions
// This module provides rate limiting based on agent capabilities

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset_at: string;
  limit: number;
}

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
}

/**
 * Check rate limit for an agent on a specific endpoint
 * Uses the agent's max_actions_per_hour capability setting
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  agentId: string,
  endpoint: string,
  customLimit?: number
): Promise<RateLimitResult> {
  try {
    // Get agent capabilities if no custom limit provided
    let maxRequests = customLimit;
    
    if (!maxRequests) {
      const { data: agent } = await supabase
        .from('agents')
        .select('capabilities')
        .eq('id', agentId)
        .single();
      
      const capabilities = agent?.capabilities as { max_actions_per_hour?: number } | null;
      maxRequests = capabilities?.max_actions_per_hour || 60;
    }

    // Check rate limit using database function
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_agent_id: agentId,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_minutes: 60,
    });

    if (error) {
      console.error('Rate limit check error:', error);
      // Default to allowing on error (fail open for availability)
      return {
        allowed: true,
        remaining: maxRequests,
        reset_at: new Date(Date.now() + 3600000).toISOString(),
        limit: maxRequests,
      };
    }

    const result = data?.[0] || { allowed: true, remaining: maxRequests, reset_at: new Date().toISOString() };
    
    return {
      allowed: result.allowed,
      remaining: result.remaining,
      reset_at: result.reset_at,
      limit: maxRequests,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open
    return {
      allowed: true,
      remaining: 60,
      reset_at: new Date(Date.now() + 3600000).toISOString(),
      limit: 60,
    };
  }
}

/**
 * Generate rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset_at,
  };
}

/**
 * Create a rate-limited error response
 */
export function createRateLimitResponse(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Rate limit exceeded',
      meta: {
        limit: result.limit,
        remaining: 0,
        reset_at: result.reset_at,
      },
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        ...getRateLimitHeaders(result),
        'Content-Type': 'application/json',
        'Retry-After': Math.ceil((new Date(result.reset_at).getTime() - Date.now()) / 1000).toString(),
      },
    }
  );
}

/**
 * Rate limit middleware for edge functions
 * Returns null if allowed, Response if rate limited
 */
export async function rateLimitMiddleware(
  supabase: SupabaseClient,
  agentId: string | null,
  endpoint: string,
  corsHeaders: Record<string, string>
): Promise<{ response: Response | null; result: RateLimitResult | null }> {
  // Skip rate limiting for unauthenticated requests (they have other limits)
  if (!agentId) {
    return { response: null, result: null };
  }

  const result = await checkRateLimit(supabase, agentId, endpoint);

  if (!result.allowed) {
    return {
      response: createRateLimitResponse(result, corsHeaders),
      result,
    };
  }

  return { response: null, result };
}
