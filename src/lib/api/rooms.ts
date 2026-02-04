import { supabase } from '@/integrations/supabase/client';
import type { Room, RoomParticipant, Synthesis, Agent } from '@/types/coherence';

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

function mapDbRoom(row: any): Room {
  return {
    room_id: row.id,
    title: row.title,
    description: row.description || '',
    topic_tags: row.topic_tags || [],
    participants: [],
    status: row.status,
    claim_ids: [],
    synthesis_id: row.synthesis_id,
    created_at: row.created_at,
  };
}

function mapDbParticipant(row: any): RoomParticipant {
  return {
    agent_id: row.agent_id,
    agent: row.agents ? mapDbAgent(row.agents) : undefined,
    role: row.role,
    joined_at: row.joined_at,
  };
}

function mapDbSynthesis(row: any): Synthesis {
  return {
    synth_id: row.id,
    room_id: row.room_id || '',
    author_agent_id: row.author_id || '',
    author: row.agents ? mapDbAgent(row.agents) : undefined,
    title: row.title,
    summary: row.summary,
    accepted_claim_ids: row.accepted_claim_ids || [],
    open_questions: row.open_questions || [],
    confidence: Number(row.confidence) || 0.5,
    limits: row.limits || [],
    status: row.status,
    created_at: row.created_at,
  };
}

export async function fetchRooms() {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapDbRoom);
}

export async function fetchRoomById(roomId: string) {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const room = mapDbRoom(data);

  // Fetch participants
  const { data: participants } = await supabase
    .from('room_participants')
    .select('*, agents(*)')
    .eq('room_id', roomId);

  if (participants) {
    room.participants = participants.map(mapDbParticipant);
  }

  // Fetch claim IDs
  const { data: roomClaims } = await supabase
    .from('room_claims')
    .select('claim_id')
    .eq('room_id', roomId);

  if (roomClaims) {
    room.claim_ids = roomClaims.map(rc => rc.claim_id);
  }

  return room;
}

export async function createRoom(room: { title: string; description: string; topic_tags: string[] }) {
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (!agent) throw new Error('No agent profile found');

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      owner_id: agent.id,
      title: room.title,
      description: room.description,
      topic_tags: room.topic_tags,
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

  return mapDbRoom(data);
}

export async function joinRoom(roomId: string, role: RoomParticipant['role']) {
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (!agent) throw new Error('No agent profile found');

  const { error } = await supabase.from('room_participants').insert({
    room_id: roomId,
    agent_id: agent.id,
    role,
  });

  if (error) throw error;
}

export async function addClaimToRoom(roomId: string, claimId: string) {
  const { error } = await supabase.from('room_claims').insert({
    room_id: roomId,
    claim_id: claimId,
  });

  if (error) throw error;
}

export async function fetchSynthesisForRoom(roomId: string) {
  const { data, error } = await supabase
    .from('syntheses')
    .select('*, agents(*)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDbSynthesis(data) : null;
}

export async function createSynthesis(synthesis: {
  room_id: string;
  title: string;
  summary: string;
  accepted_claim_ids: string[];
  open_questions: { text: string; task_id?: string }[];
  confidence: number;
  limits: string[];
}) {
  const { data: agent } = await supabase
    .from('agents')
    .select('id')
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .maybeSingle();

  if (!agent) throw new Error('No agent profile found');

  const { data, error } = await supabase
    .from('syntheses')
    .insert({
      room_id: synthesis.room_id,
      author_id: agent.id,
      title: synthesis.title,
      summary: synthesis.summary,
      accepted_claim_ids: synthesis.accepted_claim_ids,
      open_questions: synthesis.open_questions,
      confidence: synthesis.confidence,
      limits: synthesis.limits,
    })
    .select()
    .single();

  if (error) throw error;
  return mapDbSynthesis(data);
}

export async function updateRoomStatus(roomId: string, status: Room['status']) {
  const { error } = await supabase
    .from('rooms')
    .update({ status })
    .eq('id', roomId);

  if (error) throw error;
}
