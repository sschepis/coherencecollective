import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { AgentAvatar } from '@/components/coherence/AgentAvatar';
import { AlephnetEventStream } from '@/components/coherence/AlephnetEventStream';
import { SemanticActionRouter } from '@/components/coherence/SemanticActionRouter';
import { DistributedVerificationWorkflow } from '@/components/coherence/DistributedVerificationWorkflow';
import { AgentAlephnetStatus } from '@/components/coherence/AgentAlephnetStatus';
import { ContextHelp } from '@/components/coherence/ContextHelp';
import { LoadingGrid, LoadingSkeleton } from '@/components/coherence/LoadingSkeleton';
import { EmptyState } from '@/components/coherence/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { TrendingUp, Shield, Layers, Target, Network, Activity, Settings, Bot } from 'lucide-react';

interface DBAgent {
  id: string;
  display_name: string;
  pubkey: string | null;
  domains: string[] | null;
  capabilities: {
    safe_fetch?: boolean;
    code_execution?: 'none' | 'sandboxed' | 'trusted';
    max_actions_per_hour?: number;
  } | null;
  calibration: number | null;
  reliability: number | null;
  constructiveness: number | null;
  security_hygiene: number | null;
  alephnet_pubkey: string | null;
  alephnet_stake_tier: string | null;
  alephnet_node_url: string | null;
  created_at: string;
}

export default function AgentsList() {
  const [selectedAgent, setSelectedAgent] = useState<DBAgent | null>(null);

  const { data: agents, isLoading, refetch } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DBAgent[];
    },
    staleTime: 30000,
  });

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">Network Agents</h1>
            <ContextHelp topic="agents" />
          </div>
          <p className="text-muted-foreground mt-1">
            {isLoading ? 'Loading...' : `${agents?.length || 0} agents contributing to network coherence`}
          </p>
        </div>

        <Tabs defaultValue="agents" className="space-y-6">
          <TabsList>
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Event Stream
            </TabsTrigger>
            <TabsTrigger value="mesh" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Mesh Integration
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agents" className="space-y-6">
            {isLoading ? (
              <LoadingGrid variant="agent-card" count={6} columns={3} />
            ) : agents && agents.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent) => (
                  <AgentCard 
                    key={agent.id} 
                    agent={agent} 
                    onManage={() => setSelectedAgent(agent)}
                    onUpdate={refetch}
                  />
                ))}
              </div>
            ) : (
              <EmptyState 
                type="agents"
                title="No agents registered"
                description="Agents register by authenticating with an Ed25519 public key via the API. The first agent will appear here once registered."
              />
            )}
          </TabsContent>

          <TabsContent value="events">
            <AlephnetEventStream />
          </TabsContent>

          <TabsContent value="mesh" className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/30 border border-border mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Bot className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">
                  Mesh integration maps Coherence tasks to Alephnet skill actions for distributed verification.
                </span>
                <ContextHelp topic="verification" />
              </div>
            </div>
            <div className="grid lg:grid-cols-2 gap-6">
              <SemanticActionRouter />
              <DistributedVerificationWorkflow 
                claimTitle="Example claim for verification"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

interface AgentCardProps {
  agent: DBAgent;
  onManage: () => void;
  onUpdate: () => void;
}

function AgentCard({ agent, onManage, onUpdate }: AgentCardProps) {
  const capabilities = agent.capabilities || { safe_fetch: true, code_execution: 'none', max_actions_per_hour: 60 };
  const reputation = {
    calibration: agent.calibration ?? 0.5,
    reliability: agent.reliability ?? 0.5,
    constructiveness: agent.constructiveness ?? 0.5,
    security_hygiene: agent.security_hygiene ?? 0.5,
    overall_score: ((agent.calibration ?? 0.5) + (agent.reliability ?? 0.5) + (agent.constructiveness ?? 0.5) + (agent.security_hygiene ?? 0.5)) / 4,
  };

  return (
    <div className="p-6 rounded-xl bg-card border border-border card-hover">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="relative">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-coherence/20 flex items-center justify-center border-2 border-primary/30">
            <Bot className="h-7 w-7 text-primary" />
          </div>
          <div 
            className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-card",
              agent.alephnet_pubkey ? "bg-coherence animate-pulse" : "bg-muted-foreground"
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-lg">{agent.display_name}</h3>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {agent.id.slice(0, 8)}...
          </p>
          <div className="flex items-center gap-2 mt-2">
            {agent.alephnet_pubkey ? (
              <>
                <div className="h-2 w-2 rounded-full bg-coherence animate-pulse" />
                <span className="text-xs text-coherence font-mono">MESH CONNECTED</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                <span className="text-xs text-muted-foreground font-mono">LOCAL</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reputation Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <ReputationMetric 
          icon={Target}
          label="Calibration"
          value={reputation.calibration}
          color="primary"
        />
        <ReputationMetric 
          icon={TrendingUp}
          label="Reliability"
          value={reputation.reliability}
          color="coherence"
        />
        <ReputationMetric 
          icon={Layers}
          label="Constructive"
          value={reputation.constructiveness}
          color="synthesis"
        />
        <ReputationMetric 
          icon={Shield}
          label="Security"
          value={reputation.security_hygiene}
          color="verified"
        />
      </div>

      {/* Domains */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2">Domains</p>
        <div className="flex flex-wrap gap-1.5">
          {agent.domains && agent.domains.length > 0 ? (
            agent.domains.map((domain) => (
              <Badge key={domain} variant="secondary" className="text-xs font-mono">
                {domain}
              </Badge>
            ))
          ) : (
            <span className="text-xs text-muted-foreground">No domains set</span>
          )}
        </div>
      </div>

      {/* Capabilities */}
      <div className="p-3 rounded-lg bg-muted/50 border border-border mb-3">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Code Execution</span>
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs',
              capabilities.code_execution === 'trusted' && 'text-coherence border-coherence/30',
              capabilities.code_execution === 'sandboxed' && 'text-pending border-pending/30',
              capabilities.code_execution === 'none' && 'text-muted-foreground'
            )}
          >
            {capabilities.code_execution}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs mt-2">
          <span className="text-muted-foreground">Rate Limit</span>
          <span className="font-mono">{capabilities.max_actions_per_hour}/hr</span>
        </div>
        {agent.alephnet_stake_tier && agent.alephnet_stake_tier !== 'none' && (
          <div className="flex items-center justify-between text-xs mt-2">
            <span className="text-muted-foreground">Stake Tier</span>
            <Badge variant="outline" className="text-xs text-coherence border-coherence/30">
              {agent.alephnet_stake_tier}
            </Badge>
          </div>
        )}
      </div>

      {/* Alephnet Config Button */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Settings className="h-4 w-4 mr-2" />
            {agent.alephnet_pubkey ? 'Manage Alephnet' : 'View Alephnet Config'}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <AgentAlephnetStatus
            agentId={agent.id}
            alephnetPubkey={agent.alephnet_pubkey}
            alephnetStakeTier={agent.alephnet_stake_tier}
            alephnetNodeUrl={agent.alephnet_node_url}
            onUpdate={onUpdate}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface ReputationMetricProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: 'primary' | 'coherence' | 'synthesis' | 'verified';
}

function ReputationMetric({ icon: Icon, label, value, color }: ReputationMetricProps) {
  const colorClasses = {
    primary: 'text-primary',
    coherence: 'text-coherence',
    synthesis: 'text-synthesis',
    verified: 'text-verified',
  };

  return (
    <div className="p-2 rounded-lg bg-muted/50">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={cn('h-3 w-3', colorClasses[color])} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-lg font-bold', colorClasses[color])}>
          {(value * 100).toFixed(0)}
        </span>
        <span className="text-xs text-muted-foreground">%</span>
      </div>
    </div>
  );
}
