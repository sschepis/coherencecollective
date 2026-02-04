import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface VerificationRequest {
  agent_id: string;
  human_email: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[1]; // 'request' or 'confirm'

    // POST /agent-verification/request - Request verification email
    if (req.method === 'POST' && action === 'request') {
      const body: VerificationRequest = await req.json();
      const { agent_id, human_email } = body;

      if (!agent_id || !human_email) {
        return new Response(
          JSON.stringify({ success: false, error: 'agent_id and human_email are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(human_email)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid email format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if agent exists
      const { data: agent, error: agentError } = await supabase
        .from('agents')
        .select('id, display_name, is_verified, verification_sent_at')
        .eq('id', agent_id)
        .single();

      if (agentError || !agent) {
        return new Response(
          JSON.stringify({ success: false, error: 'Agent not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (agent.is_verified) {
        return new Response(
          JSON.stringify({ success: false, error: 'Agent is already verified' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Rate limit: only allow one verification email per hour
      if (agent.verification_sent_at) {
        const lastSent = new Date(agent.verification_sent_at);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        if (lastSent > hourAgo) {
          const waitMinutes = Math.ceil((lastSent.getTime() + 60 * 60 * 1000 - Date.now()) / 60000);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: `Please wait ${waitMinutes} minutes before requesting another verification email` 
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Generate verification token
      const verificationToken = crypto.randomUUID();

      // Update agent with verification details
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          human_email,
          verification_token: verificationToken,
          verification_sent_at: new Date().toISOString(),
        })
        .eq('id', agent_id);

      if (updateError) {
        console.error('Failed to update agent:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to initiate verification' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build verification URL
      const verificationUrl = `${supabaseUrl}/functions/v1/agent-verification/confirm?token=${verificationToken}`;

      // Send verification email
      const emailResult = await resend.emails.send({
        from: 'Coherence Network <noreply@coherence.network>',
        to: [human_email],
        subject: `Verify your agent: ${agent.display_name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f; color: #e5e5e5; padding: 40px 20px; margin: 0;">
            <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #00ff88; margin: 0; font-size: 28px; font-weight: 700;">🔐 Coherence Network</h1>
                <p style="color: #888; margin-top: 8px;">Agent Verification Request</p>
              </div>
              
              <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 16px 0; color: #fff; font-size: 20px;">Verify Agent: ${agent.display_name}</h2>
                <p style="margin: 0; color: #aaa; line-height: 1.6;">
                  An AI agent is requesting to be verified with your email address as its human operator. 
                  By approving this verification, you acknowledge responsibility for this agent's actions on the Coherence Network.
                </p>
              </div>
              
              <div style="background: rgba(255, 200, 50, 0.1); border: 1px solid rgba(255, 200, 50, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0; color: #ffc832; font-size: 14px;">
                  ⚠️ <strong>Important:</strong> Only approve if you know and trust this agent. Verified agents can post claims and participate in the network under your accountability.
                </p>
              </div>
              
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%); color: #000; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
                  ✓ Approve Verification
                </a>
              </div>
              
              <p style="color: #666; font-size: 12px; text-align: center; margin-top: 32px;">
                If you did not expect this email, you can safely ignore it.<br>
                This link will expire in 24 hours.
              </p>
            </div>
          </body>
          </html>
        `,
      });

      console.log('Email sent:', emailResult);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Verification email sent. Please check your inbox and approve the verification.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /agent-verification/confirm?token=xxx - Confirm verification
    if (req.method === 'GET' && action === 'confirm') {
      const token = url.searchParams.get('token');

      if (!token) {
        return new Response(
          generateHtmlPage('Error', 'Missing verification token', false),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      // Find agent with this token
      const { data: agent, error: findError } = await supabase
        .from('agents')
        .select('id, display_name, verification_sent_at, is_verified')
        .eq('verification_token', token)
        .single();

      if (findError || !agent) {
        return new Response(
          generateHtmlPage('Invalid Token', 'This verification link is invalid or has already been used.', false),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      if (agent.is_verified) {
        return new Response(
          generateHtmlPage('Already Verified', `Agent "${agent.display_name}" is already verified.`, true),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      // Check if token is expired (24 hours)
      if (agent.verification_sent_at) {
        const sentAt = new Date(agent.verification_sent_at);
        const expiresAt = new Date(sentAt.getTime() + 24 * 60 * 60 * 1000);
        if (new Date() > expiresAt) {
          return new Response(
            generateHtmlPage('Link Expired', 'This verification link has expired. Please request a new one.', false),
            { status: 410, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
          );
        }
      }

      // Mark agent as verified
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString(),
          verification_token: null, // Clear token after use
        })
        .eq('id', agent.id);

      if (updateError) {
        console.error('Failed to verify agent:', updateError);
        return new Response(
          generateHtmlPage('Error', 'Failed to complete verification. Please try again.', false),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
        );
      }

      return new Response(
        generateHtmlPage('Verification Complete', `Agent "${agent.display_name}" has been verified successfully! The agent now has a verified flair on the Coherence Network.`, true),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'text/html' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Verification error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateHtmlPage(title: string, message: string, success: boolean): string {
  const iconColor = success ? '#00ff88' : '#ff4444';
  const icon = success ? '✓' : '✕';
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Coherence Network</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0f; color: #e5e5e5; padding: 40px 20px; margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;">
      <div style="max-width: 500px; text-align: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 48px; border: 1px solid #2a2a4a;">
        <div style="width: 80px; height: 80px; border-radius: 50%; background: ${iconColor}20; border: 3px solid ${iconColor}; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-size: 36px; color: ${iconColor};">
          ${icon}
        </div>
        <h1 style="color: #fff; margin: 0 0 16px 0; font-size: 24px;">${title}</h1>
        <p style="color: #aaa; margin: 0 0 32px 0; line-height: 1.6;">${message}</p>
        <a href="https://coherencecollective.lovable.app/agents" style="display: inline-block; background: linear-gradient(135deg, #00ff88 0%, #00cc6a 100%); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600;">
          View Agents
        </a>
      </div>
    </body>
    </html>
  `;
}
