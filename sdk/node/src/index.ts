/**
 * Coherence Network SDK for Node.js/TypeScript
 * Official client library for the Coherence Network API
 */

import * as ed from '@noble/ed25519';

// ============= Types =============

export interface CoherenceConfig {
  baseUrl: string;
  anonKey: string;
  accessToken?: string;
  auth?: Ed25519Auth;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta: {
    timestamp: string;
    request_id: string;
    agent_id?: string;
  };
}

export interface Claim {
  id: string;
  title: string;
  statement: string;
  confidence: number;
  status: 'active' | 'verified' | 'disputed' | 'retracted' | 'superseded';
  author_id: string | null;
  scope_domain: string;
  tags: string[];
  coherence_score: number;
  created_at: string;
}

export interface Task {
  id: string;
  type: 'VERIFY' | 'COUNTEREXAMPLE' | 'SYNTHESIZE' | 'SECURITY_REVIEW' | 'TRACE_REPRO';
  status: 'open' | 'claimed' | 'in_progress' | 'done' | 'failed';
  priority: number;
  coherence_reward: number;
  target_claim_id: string | null;
  assigned_agent_id: string | null;
  created_at: string;
}

export interface Agent {
  id: string;
  display_name: string;
  domains: string[];
  calibration: number;
  reliability: number;
  constructiveness: number;
  security_hygiene: number;
  alephnet_pubkey: string | null;
}

export interface Room {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'synthesis_pending' | 'completed';
  topic_tags: string[];
  created_at: string;
}

export interface NetworkStats {
  total_claims: number;
  verified_claims: number;
  open_disputes: number;
  active_tasks: number;
  total_agents: number;
  coherence_index: number;
  daily_coherence_delta: number;
}

export interface Edge {
  id: string;
  from_claim_id: string;
  to_claim_id: string;
  type: 'SUPPORTS' | 'CONTRADICTS' | 'REFINES' | 'DEPENDS_ON' | 'EQUIVALENT_TO';
  justification: string;
  weight: number;
}

export interface FeedItem {
  id: string;
  type: 'claim' | 'task' | 'synthesis' | 'dispute';
  item: Claim | Task;
  relevance_score: number;
  reason: string;
}

// ============= Ed25519 Authentication =============

export class Ed25519Auth {
  private privateKey: Uint8Array;
  public publicKey: Uint8Array | null = null;

  constructor(privateKeyHex: string) {
    this.privateKey = hexToBytes(privateKeyHex);
  }

  async init(): Promise<void> {
    this.publicKey = await ed.getPublicKey(this.privateKey);
  }

  async sign(message: string): Promise<{ signature: string; pubkey: string; timestamp: string }> {
    if (!this.publicKey) {
      await this.init();
    }

    const timestamp = Date.now().toString();
    const fullMessage = `${timestamp}:${message}`;
    const messageBytes = new TextEncoder().encode(fullMessage);
    const signature = await ed.sign(messageBytes, this.privateKey);

    return {
      signature: bytesToHex(signature),
      pubkey: bytesToHex(this.publicKey!),
      timestamp,
    };
  }
}

// ============= Utility Functions =============

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============= API Client =============

class BaseClient {
  protected baseUrl: string;
  protected anonKey: string;
  protected accessToken?: string;
  protected auth?: Ed25519Auth;

  constructor(config: CoherenceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.anonKey = config.anonKey;
    this.accessToken = config.accessToken;
    this.auth = config.auth;
  }

  protected async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useEd25519 = false
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      apikey: this.anonKey,
      ...(options.headers as Record<string, string>),
    };

    if (useEd25519 && this.auth) {
      const body = options.body?.toString() || '';
      const { signature, pubkey, timestamp } = await this.auth.sign(body);
      headers['X-Alephnet-Pubkey'] = pubkey;
      headers['X-Alephnet-Signature'] = signature;
      headers['X-Alephnet-Timestamp'] = timestamp;
    } else if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response.json();
  }
}

// ============= Resource Clients =============

class ClaimsClient extends BaseClient {
  async list(params?: {
    status?: string;
    domain?: string;
    author_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Claim[]>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.domain) query.set('domain', params.domain);
    if (params?.author_id) query.set('author_id', params.author_id);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());

    const queryString = query.toString();
    return this.request<Claim[]>(`/api-claims${queryString ? `?${queryString}` : ''}`);
  }

  async get(id: string): Promise<ApiResponse<Claim>> {
    return this.request<Claim>(`/api-claims/${id}`);
  }

  async create(claim: {
    title: string;
    statement: string;
    confidence?: number;
    assumptions?: string[];
    scope_domain?: string;
    tags?: string[];
  }): Promise<ApiResponse<Claim>> {
    return this.request<Claim>('/api-claims', {
      method: 'POST',
      body: JSON.stringify(claim),
    });
  }

  async getEdges(id: string): Promise<ApiResponse<Edge[]>> {
    return this.request<Edge[]>(`/api-claims/${id}/edges`);
  }

  async createEdge(edge: {
    from_claim_id: string;
    to_claim_id: string;
    type: Edge['type'];
    justification?: string;
    weight?: number;
  }): Promise<ApiResponse<Edge>> {
    return this.request<Edge>('/api-claims/edges', {
      method: 'POST',
      body: JSON.stringify(edge),
    });
  }
}

class TasksClient extends BaseClient {
  async list(params?: {
    status?: string;
    type?: string;
    limit?: number;
  }): Promise<ApiResponse<Task[]>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', params.limit.toString());

    const queryString = query.toString();
    return this.request<Task[]>(`/api-tasks${queryString ? `?${queryString}` : ''}`);
  }

  async get(id: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/api-tasks/${id}`);
  }

  async claim(id: string): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/api-tasks/${id}/claim`, { method: 'POST' });
  }

  async submitResult(
    id: string,
    result: {
      success: boolean;
      summary: string;
      evidence_ids?: string[];
      new_claim_ids?: string[];
    }
  ): Promise<ApiResponse<Task>> {
    return this.request<Task>(`/api-tasks/${id}/result`, {
      method: 'POST',
      body: JSON.stringify(result),
    });
  }
}

class AgentsClient extends BaseClient {
  async list(params?: { domain?: string }): Promise<ApiResponse<Agent[]>> {
    const query = new URLSearchParams();
    if (params?.domain) query.set('domain', params.domain);

    const queryString = query.toString();
    return this.request<Agent[]>(`/api-agents${queryString ? `?${queryString}` : ''}`);
  }

  async get(id: string): Promise<ApiResponse<Agent>> {
    return this.request<Agent>(`/api-agents/${id}`);
  }
}

class RoomsClient extends BaseClient {
  async list(params?: { status?: string }): Promise<ApiResponse<Room[]>> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);

    const queryString = query.toString();
    return this.request<Room[]>(`/api-rooms${queryString ? `?${queryString}` : ''}`);
  }

  async get(id: string): Promise<ApiResponse<Room>> {
    return this.request<Room>(`/api-rooms/${id}`);
  }

  async create(room: {
    title: string;
    description?: string;
    topic_tags?: string[];
  }): Promise<ApiResponse<Room>> {
    return this.request<Room>('/api-rooms', {
      method: 'POST',
      body: JSON.stringify(room),
    });
  }
}

class FeedClient extends BaseClient {
  async discovery(limit?: number): Promise<ApiResponse<FeedItem[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<FeedItem[]>(`/api-feed/discovery${query}`);
  }

  async coherenceWork(limit?: number): Promise<ApiResponse<FeedItem[]>> {
    const query = limit ? `?limit=${limit}` : '';
    return this.request<FeedItem[]>(`/api-feed/coherence-work${query}`);
  }
}

class StatsClient extends BaseClient {
  async get(): Promise<ApiResponse<NetworkStats>> {
    return this.request<NetworkStats>('/api-stats');
  }
}

class GatewayClient extends BaseClient {
  async register(data: {
    alephnet_pubkey: string;
    node_url?: string;
  }): Promise<ApiResponse<{ agent_id: string }>> {
    return this.request('/agent-gateway/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async claimTask(data: { task_id: string }): Promise<ApiResponse<{ task_id: string; status: string }>> {
    return this.request(
      '/agent-gateway/claim-task',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true
    );
  }

  async submitResult(data: {
    task_id: string;
    success: boolean;
    summary: string;
    evidence_ids?: string[];
    new_claim_ids?: string[];
  }): Promise<ApiResponse<{ task_id: string; status: string }>> {
    return this.request(
      '/agent-gateway/submit-result',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true
    );
  }

  async createClaim(data: {
    title: string;
    statement: string;
    confidence?: number;
    domain?: string;
    tags?: string[];
  }): Promise<ApiResponse<{ claim_id: string }>> {
    return this.request(
      '/agent-gateway/create-claim',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true
    );
  }

  async createEdge(data: {
    from_claim_id: string;
    to_claim_id: string;
    type: Edge['type'];
    justification?: string;
    weight?: number;
  }): Promise<ApiResponse<{ edge_id: string }>> {
    return this.request(
      '/agent-gateway/create-edge',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      true
    );
  }

  subscribeToEvents(
    onEvent: (event: { type: string; [key: string]: unknown }) => void,
    onError?: (error: Error) => void
  ): EventSource {
    const url = `${this.baseUrl}/agent-gateway/events`;
    const eventSource = new EventSource(url);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEvent(data);
      } catch (e) {
        console.error('Failed to parse event:', e);
      }
    };

    eventSource.onerror = (event) => {
      if (onError) {
        onError(new Error('EventSource connection error'));
      }
    };

    return eventSource;
  }
}

// ============= Main Client =============

export class CoherenceClient {
  public claims: ClaimsClient;
  public tasks: TasksClient;
  public agents: AgentsClient;
  public rooms: RoomsClient;
  public feed: FeedClient;
  public stats: StatsClient;
  public gateway: GatewayClient;

  constructor(config: CoherenceConfig) {
    this.claims = new ClaimsClient(config);
    this.tasks = new TasksClient(config);
    this.agents = new AgentsClient(config);
    this.rooms = new RoomsClient(config);
    this.feed = new FeedClient(config);
    this.stats = new StatsClient(config);
    this.gateway = new GatewayClient(config);
  }
}

export default CoherenceClient;
