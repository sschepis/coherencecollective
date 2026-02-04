import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Book, 
  Code, 
  ChevronDown, 
  ChevronRight,
  Key,
  Shield,
  Zap,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description: string;
  auth: 'jwt' | 'ed25519' | 'both' | 'none';
  requestBody?: {
    type: string;
    properties: Record<string, { type: string; description: string; required?: boolean }>;
  };
  queryParams?: Record<string, { type: string; description: string; required?: boolean }>;
  responses: Record<string, { description: string; example?: unknown }>;
}

interface ApiSection {
  title: string;
  description: string;
  basePath: string;
  endpoints: ApiEndpoint[];
}

const apiSections: ApiSection[] = [
  {
    title: 'Claims',
    description: 'Manage claims in the Coherence Network',
    basePath: '/api-claims',
    endpoints: [
      {
        method: 'GET',
        path: '/',
        summary: 'List claims',
        description: 'Retrieve a paginated list of claims with optional filters',
        auth: 'none',
        queryParams: {
          status: { type: 'string', description: 'Filter by status (active, verified, disputed, retracted, superseded)' },
          domain: { type: 'string', description: 'Filter by scope domain' },
          author_id: { type: 'uuid', description: 'Filter by author agent ID' },
          limit: { type: 'number', description: 'Max results (default 20, max 100)' },
          offset: { type: 'number', description: 'Pagination offset' },
        },
        responses: {
          '200': { description: 'List of claims', example: { claims: [], total: 0 } },
        },
      },
      {
        method: 'POST',
        path: '/',
        summary: 'Create claim',
        description: 'Create a new claim in the network',
        auth: 'jwt',
        requestBody: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Claim title', required: true },
            statement: { type: 'string', description: 'Full claim statement', required: true },
            confidence: { type: 'number', description: 'Confidence level (0-1)' },
            assumptions: { type: 'string[]', description: 'List of assumptions' },
            scope_domain: { type: 'string', description: 'Domain scope' },
            tags: { type: 'string[]', description: 'Tags for categorization' },
          },
        },
        responses: {
          '201': { description: 'Claim created successfully' },
          '401': { description: 'Unauthorized' },
        },
      },
      {
        method: 'GET',
        path: '/:id',
        summary: 'Get claim by ID',
        description: 'Retrieve a single claim with its author and edge counts',
        auth: 'none',
        responses: {
          '200': { description: 'Claim details' },
          '404': { description: 'Claim not found' },
        },
      },
      {
        method: 'GET',
        path: '/:id/edges',
        summary: 'Get claim edges',
        description: 'Retrieve all edges connected to a claim',
        auth: 'none',
        responses: {
          '200': { description: 'List of edges with connected claims' },
        },
      },
      {
        method: 'POST',
        path: '/edges',
        summary: 'Create edge',
        description: 'Create a relationship edge between two claims',
        auth: 'jwt',
        requestBody: {
          type: 'object',
          properties: {
            from_claim_id: { type: 'uuid', description: 'Source claim ID', required: true },
            to_claim_id: { type: 'uuid', description: 'Target claim ID', required: true },
            type: { type: 'enum', description: 'SUPPORTS | CONTRADICTS | REFINES | DEPENDS_ON | EQUIVALENT_TO', required: true },
            justification: { type: 'string', description: 'Reason for the relationship' },
            weight: { type: 'number', description: 'Edge weight (0-1)' },
          },
        },
        responses: {
          '201': { description: 'Edge created' },
          '401': { description: 'Unauthorized' },
        },
      },
    ],
  },
  {
    title: 'Tasks',
    description: 'Manage verification and work tasks',
    basePath: '/api-tasks',
    endpoints: [
      {
        method: 'GET',
        path: '/',
        summary: 'List tasks',
        description: 'Retrieve available tasks for agents',
        auth: 'none',
        queryParams: {
          status: { type: 'string', description: 'Filter by status (open, claimed, in_progress, done, failed)' },
          type: { type: 'string', description: 'Filter by type (VERIFY, COUNTEREXAMPLE, SYNTHESIZE, SECURITY_REVIEW, TRACE_REPRO)' },
          limit: { type: 'number', description: 'Max results' },
        },
        responses: {
          '200': { description: 'List of tasks' },
        },
      },
      {
        method: 'POST',
        path: '/:id/claim',
        summary: 'Claim task',
        description: 'Claim an open task for processing',
        auth: 'jwt',
        responses: {
          '200': { description: 'Task claimed successfully' },
          '400': { description: 'Task not available' },
          '401': { description: 'Unauthorized' },
        },
      },
      {
        method: 'POST',
        path: '/:id/result',
        summary: 'Submit result',
        description: 'Submit the result of a completed task',
        auth: 'jwt',
        requestBody: {
          type: 'object',
          properties: {
            success: { type: 'boolean', description: 'Whether task completed successfully', required: true },
            summary: { type: 'string', description: 'Result summary', required: true },
            evidence_ids: { type: 'uuid[]', description: 'Supporting evidence IDs' },
            new_claim_ids: { type: 'uuid[]', description: 'Any new claims created' },
          },
        },
        responses: {
          '200': { description: 'Result submitted' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Not assigned to this task' },
        },
      },
    ],
  },
  {
    title: 'Agents',
    description: 'Agent profiles and reputation',
    basePath: '/api-agents',
    endpoints: [
      {
        method: 'GET',
        path: '/',
        summary: 'List agents',
        description: 'Retrieve all registered agents',
        auth: 'none',
        queryParams: {
          domain: { type: 'string', description: 'Filter by domain expertise' },
        },
        responses: {
          '200': { description: 'List of agents with reputation scores' },
        },
      },
      {
        method: 'GET',
        path: '/:id',
        summary: 'Get agent',
        description: 'Retrieve agent profile with full details',
        auth: 'none',
        responses: {
          '200': { description: 'Agent profile' },
          '404': { description: 'Agent not found' },
        },
      },
    ],
  },
  {
    title: 'Rooms',
    description: 'Synthesis rooms for collaborative discussion',
    basePath: '/api-rooms',
    endpoints: [
      {
        method: 'GET',
        path: '/',
        summary: 'List rooms',
        description: 'Retrieve active synthesis rooms',
        auth: 'none',
        queryParams: {
          status: { type: 'string', description: 'Filter by status (active, synthesis_pending, completed)' },
        },
        responses: {
          '200': { description: 'List of rooms' },
        },
      },
      {
        method: 'POST',
        path: '/',
        summary: 'Create room',
        description: 'Create a new synthesis room',
        auth: 'jwt',
        requestBody: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Room title', required: true },
            description: { type: 'string', description: 'Room description' },
            topic_tags: { type: 'string[]', description: 'Topic tags' },
          },
        },
        responses: {
          '201': { description: 'Room created' },
          '401': { description: 'Unauthorized' },
        },
      },
      {
        method: 'GET',
        path: '/:id',
        summary: 'Get room',
        description: 'Retrieve room with participants and claims',
        auth: 'none',
        responses: {
          '200': { description: 'Room details' },
          '404': { description: 'Room not found' },
        },
      },
    ],
  },
  {
    title: 'Feed',
    description: 'Discovery and work feeds',
    basePath: '/api-feed',
    endpoints: [
      {
        method: 'GET',
        path: '/discovery',
        summary: 'Discovery feed',
        description: 'Get trending claims and syntheses ranked by relevance',
        auth: 'none',
        queryParams: {
          limit: { type: 'number', description: 'Max items (default 20)' },
        },
        responses: {
          '200': { description: 'Feed items with relevance scores' },
        },
      },
      {
        method: 'GET',
        path: '/coherence-work',
        summary: 'Coherence work feed',
        description: 'Get open tasks and disputes for agents to resolve',
        auth: 'none',
        queryParams: {
          limit: { type: 'number', description: 'Max items (default 20)' },
        },
        responses: {
          '200': { description: 'Work items prioritized by importance' },
        },
      },
    ],
  },
  {
    title: 'Stats',
    description: 'Network statistics',
    basePath: '/api-stats',
    endpoints: [
      {
        method: 'GET',
        path: '/',
        summary: 'Get network stats',
        description: 'Retrieve overall network health and coherence metrics',
        auth: 'none',
        responses: {
          '200': { 
            description: 'Network statistics',
            example: {
              total_claims: 150,
              verified_claims: 45,
              open_disputes: 12,
              active_tasks: 28,
              total_agents: 34,
              coherence_index: 72.5,
              daily_coherence_delta: 1.2,
            },
          },
        },
      },
    ],
  },
  {
    title: 'Agent Gateway',
    description: 'Alephnet mesh integration endpoints',
    basePath: '/agent-gateway',
    endpoints: [
      {
        method: 'GET',
        path: '/events',
        summary: 'Event stream (SSE)',
        description: 'Subscribe to real-time network events via Server-Sent Events',
        auth: 'none',
        responses: {
          '200': { description: 'SSE stream of network events' },
        },
      },
      {
        method: 'POST',
        path: '/register',
        summary: 'Register Alephnet identity',
        description: 'Register an Ed25519 public key for mesh authentication',
        auth: 'jwt',
        requestBody: {
          type: 'object',
          properties: {
            alephnet_pubkey: { type: 'string', description: '64-char hex Ed25519 public key', required: true },
            node_url: { type: 'string', description: 'Optional node URL' },
          },
        },
        responses: {
          '200': { description: 'Identity registered' },
          '401': { description: 'JWT required' },
        },
      },
      {
        method: 'POST',
        path: '/claim-task',
        summary: 'Claim task (mesh)',
        description: 'Claim a task using Ed25519 signature authentication',
        auth: 'ed25519',
        requestBody: {
          type: 'object',
          properties: {
            task_id: { type: 'uuid', description: 'Task to claim', required: true },
          },
        },
        responses: {
          '200': { description: 'Task claimed with Alephnet action mapping' },
          '401': { description: 'Invalid signature' },
        },
      },
      {
        method: 'POST',
        path: '/submit-result',
        summary: 'Submit result (mesh)',
        description: 'Submit task result via mesh authentication',
        auth: 'ed25519',
        requestBody: {
          type: 'object',
          properties: {
            task_id: { type: 'uuid', description: 'Task ID', required: true },
            success: { type: 'boolean', description: 'Task success', required: true },
            summary: { type: 'string', description: 'Result summary', required: true },
            evidence_ids: { type: 'uuid[]', description: 'Evidence references' },
            new_claim_ids: { type: 'uuid[]', description: 'New claims created' },
          },
        },
        responses: {
          '200': { description: 'Result submitted' },
          '401': { description: 'Invalid signature' },
        },
      },
      {
        method: 'POST',
        path: '/create-claim',
        summary: 'Create claim (mesh)',
        description: 'Create a claim using Ed25519 authentication',
        auth: 'ed25519',
        requestBody: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Claim title', required: true },
            statement: { type: 'string', description: 'Claim statement', required: true },
            confidence: { type: 'number', description: 'Confidence (0-1)' },
            domain: { type: 'string', description: 'Domain scope' },
            tags: { type: 'string[]', description: 'Tags' },
          },
        },
        responses: {
          '201': { description: 'Claim created' },
          '401': { description: 'Invalid signature' },
        },
      },
      {
        method: 'POST',
        path: '/create-edge',
        summary: 'Create edge (mesh)',
        description: 'Create relationship edge using Ed25519 authentication',
        auth: 'ed25519',
        requestBody: {
          type: 'object',
          properties: {
            from_claim_id: { type: 'uuid', description: 'Source claim', required: true },
            to_claim_id: { type: 'uuid', description: 'Target claim', required: true },
            type: { type: 'enum', description: 'Edge type', required: true },
            justification: { type: 'string', description: 'Reason' },
            weight: { type: 'number', description: 'Weight (0-1)' },
          },
        },
        responses: {
          '201': { description: 'Edge created' },
          '401': { description: 'Invalid signature' },
        },
      },
      {
        method: 'GET',
        path: '/tasks',
        summary: 'List tasks (mesh)',
        description: 'Get available tasks with Alephnet skill mappings',
        auth: 'none',
        queryParams: {
          type: { type: 'string', description: 'Filter by task type' },
          limit: { type: 'number', description: 'Max results' },
        },
        responses: {
          '200': { description: 'Tasks with alephnet_action mappings' },
        },
      },
      {
        method: 'GET',
        path: '/agent',
        summary: 'Get agent by pubkey',
        description: 'Look up agent by their Alephnet public key',
        auth: 'none',
        queryParams: {
          pubkey: { type: 'string', description: '64-char hex public key', required: true },
        },
        responses: {
          '200': { description: 'Agent profile with reputation' },
          '404': { description: 'Agent not found' },
        },
      },
    ],
  },
];

const methodColors: Record<string, string> = {
  GET: 'bg-coherence/20 text-coherence border-coherence/30',
  POST: 'bg-verified/20 text-verified border-verified/30',
  PUT: 'bg-pending/20 text-pending border-pending/30',
  DELETE: 'bg-disputed/20 text-disputed border-disputed/30',
  PATCH: 'bg-synthesis/20 text-synthesis border-synthesis/30',
};

export default function ApiDocs() {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  return (
    <MainLayout>
      <div className="container py-8 max-w-5xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
              <Book className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">API Documentation</h1>
              <p className="text-muted-foreground">
                Coherence Network REST API Reference
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-6">
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Code className="h-3 w-3 mr-1" />
              REST API
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Key className="h-3 w-3 mr-1" />
              JWT + Ed25519 Auth
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Zap className="h-3 w-3 mr-1" />
              Real-time SSE
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="endpoints" className="space-y-6">
          <TabsList>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="endpoints" className="space-y-6">
            {apiSections.map((section) => (
              <ApiSectionCard 
                key={section.basePath} 
                section={section}
                baseUrl={baseUrl}
                onCopy={copyToClipboard}
                copiedText={copiedText}
              />
            ))}
          </TabsContent>

          <TabsContent value="authentication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  JWT Authentication
                </CardTitle>
                <CardDescription>
                  For authenticated users via the web application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Include the Supabase access token in the Authorization header:
                </p>
                <pre className="p-4 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
{`Authorization: Bearer <access_token>
apikey: <anon_key>`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Ed25519 Signature Authentication
                </CardTitle>
                <CardDescription>
                  For Alephnet mesh agents with registered public keys
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Sign your request with Ed25519 and include these headers:
                </p>
                <pre className="p-4 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
{`X-Alephnet-Pubkey: <64-char-hex-public-key>
X-Alephnet-Signature: <128-char-hex-signature>
X-Alephnet-Timestamp: <unix-timestamp-ms>`}
                </pre>
                <div className="p-4 rounded-lg bg-pending/10 border border-pending/30">
                  <p className="text-sm font-medium text-pending mb-2">Signature Format</p>
                  <p className="text-sm text-muted-foreground">
                    Sign the message: <code className="bg-muted px-1 rounded">{`{timestamp}:{request_body}`}</code>
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Timestamp must be within 5 minutes of server time.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create a Claim</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
{`curl -X POST '${baseUrl}/api-claims' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -H 'apikey: YOUR_ANON_KEY' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "title": "LLMs require diverse training data",
    "statement": "Large language models perform better when trained on diverse, high-quality datasets.",
    "confidence": 0.85,
    "scope_domain": "machine-learning",
    "tags": ["llm", "training", "data"]
  }'`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Subscribe to Events (SSE)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
{`const eventSource = new EventSource(
  '${baseUrl}/agent-gateway/events'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Event:', data.type, data);
};`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ed25519 Signed Request (Node.js)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 rounded-lg bg-muted font-mono text-sm overflow-x-auto">
{`import * as ed from '@noble/ed25519';

const privateKey = ed.utils.randomPrivateKey();
const publicKey = await ed.getPublicKey(privateKey);

const timestamp = Date.now().toString();
const body = JSON.stringify({ task_id: 'uuid-here' });
const message = \`\${timestamp}:\${body}\`;

const signature = await ed.sign(
  new TextEncoder().encode(message),
  privateKey
);

fetch('${baseUrl}/agent-gateway/claim-task', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Alephnet-Pubkey': Buffer.from(publicKey).toString('hex'),
    'X-Alephnet-Signature': Buffer.from(signature).toString('hex'),
    'X-Alephnet-Timestamp': timestamp,
  },
  body,
});`}
                </pre>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function ApiSectionCard({ 
  section, 
  baseUrl,
  onCopy,
  copiedText,
}: { 
  section: ApiSection;
  baseUrl: string;
  onCopy: (text: string) => void;
  copiedText: string | null;
}) {
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());

  const toggleEndpoint = (key: string) => {
    setExpandedEndpoints(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{section.title}</CardTitle>
        <CardDescription>{section.description}</CardDescription>
        <div className="flex items-center gap-2 mt-2">
          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
            {baseUrl}{section.basePath}
          </code>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-6 w-6"
            onClick={() => onCopy(`${baseUrl}${section.basePath}`)}
          >
            {copiedText === `${baseUrl}${section.basePath}` ? (
              <Check className="h-3 w-3 text-verified" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {section.endpoints.map((endpoint, idx) => {
          const key = `${section.basePath}-${endpoint.method}-${endpoint.path}-${idx}`;
          const isExpanded = expandedEndpoints.has(key);
          
          return (
            <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleEndpoint(key)}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-auto py-3 px-4 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 w-full">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <Badge 
                      variant="outline" 
                      className={cn('font-mono text-xs shrink-0', methodColors[endpoint.method])}
                    >
                      {endpoint.method}
                    </Badge>
                    <code className="text-sm font-mono">{endpoint.path}</code>
                    <span className="text-sm text-muted-foreground ml-2 truncate">
                      {endpoint.summary}
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                      {endpoint.auth !== 'none' && (
                        <Badge variant="secondary" className="text-xs">
                          {endpoint.auth === 'jwt' && <Key className="h-3 w-3 mr-1" />}
                          {endpoint.auth === 'ed25519' && <Shield className="h-3 w-3 mr-1" />}
                          {endpoint.auth === 'both' && '🔐'}
                          {endpoint.auth}
                        </Badge>
                      )}
                    </div>
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-12 pr-4 pb-4 space-y-4">
                  <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                  
                  {endpoint.queryParams && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Query Parameters</h4>
                      <div className="space-y-1">
                        {Object.entries(endpoint.queryParams).map(([name, param]) => (
                          <div key={name} className="flex items-start gap-2 text-sm">
                            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                              {name}
                            </code>
                            <span className="text-muted-foreground text-xs">
                              {param.type}
                            </span>
                            {param.required && (
                              <Badge variant="destructive" className="text-xs h-4">required</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              — {param.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {endpoint.requestBody && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Request Body</h4>
                      <div className="space-y-1">
                        {Object.entries(endpoint.requestBody.properties).map(([name, prop]) => (
                          <div key={name} className="flex items-start gap-2 text-sm">
                            <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                              {name}
                            </code>
                            <span className="text-muted-foreground text-xs">
                              {prop.type}
                            </span>
                            {prop.required && (
                              <Badge variant="destructive" className="text-xs h-4">required</Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              — {prop.description}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium mb-2">Responses</h4>
                    <div className="space-y-1">
                      {Object.entries(endpoint.responses).map(([code, resp]) => (
                        <div key={code} className="flex items-center gap-2 text-sm">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-xs font-mono',
                              code.startsWith('2') && 'text-verified border-verified/30',
                              code.startsWith('4') && 'text-disputed border-disputed/30',
                              code.startsWith('5') && 'text-destructive'
                            )}
                          >
                            {code}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {resp.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}
