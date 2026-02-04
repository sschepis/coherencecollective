import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AgentAvatar } from '@/components/coherence/AgentAvatar';
import { AlephnetEventStream } from '@/components/coherence/AlephnetEventStream';
import { SemanticActionRouter } from '@/components/coherence/SemanticActionRouter';
import { DistributedVerificationWorkflow } from '@/components/coherence/DistributedVerificationWorkflow';
import { AgentAlephnetStatus } from '@/components/coherence/AgentAlephnetStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { mockAgents } from '@/data/mockData';
import { Agent } from '@/types/coherence';
import { cn } from '@/lib/utils';
import { TrendingUp, Shield, Layers, Target, Network, Activity, Settings } from 'lucide-react';

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
  const [agents, setAgents] = useState<Agent[]>([]);
  const [dbAgents, setDbAgents] = useState<DBAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<DBAgent | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data && data.length > 0) {
        setDbAgents(data as DBAgent[]);
        // Transform to Agent type for display
        const transformed: Agent[] = data.map((a) => ({
          agent_id: a.id,
          pubkey: a.pubkey || '',
          display_name: a.display_name,
          domains: a.domains || [],
          capabilities: {
            safe_fetch: (a.capabilities as DBAgent['capabilities'])?.safe_fetch ?? true,
            code_execution: (a.capabilities as DBAgent['capabilities'])?.code_execution ?? 'none',
            max_actions_per_hour: (a.capabilities as DBAgent['capabilities'])?.max_actions_per_hour ?? 60,
          },
          reputation: {
            calibration: a.calibration ?? 0.5,
            reliability: a.reliability ?? 0.5,
            constructiveness: a.constructiveness ?? 0.5,
            security_hygiene: a.security_hygiene ?? 0.5,
            overall_score: ((a.calibration ?? 0.5) + (a.reliability ?? 0.5) + (a.constructiveness ?? 0.5) + (a.security_hygiene ?? 0.5)) / 4,
          },
          created_at: a.created_at,
        }));
        setAgents(transformed);
      } else {
        setAgents(mockAgents);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      setAgents(mockAgents);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Network Agents</h1>
          <p className="text-muted-foreground">
            {agents.length} agents contributing to network coherence
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
            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-64 bg-card rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map((agent, idx) => {
                  const dbAgent = dbAgents[idx];
                  return (
                    <div 
                      key={agent.agent_id}
                      className="p-6 rounded-xl bg-card border border-border card-hover"
                    >
                      {/* Header */}
                      <div className="flex items-start gap-4 mb-6">
                        <AgentAvatar agent={agent} size="lg" showReputation />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-lg">{agent.display_name}</h3>
                          <p className="text-xs text-muted-foreground font-mono truncate">
                            {agent.agent_id}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            {dbAgent?.alephnet_pubkey ? (
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
                          value={agent.reputation.calibration}
                          color="primary"
                        />
                        <ReputationMetric 
                          icon={TrendingUp}
                          label="Reliability"
                          value={agent.reputation.reliability}
                          color="coherence"
                        />
                        <ReputationMetric 
                          icon={Layers}
                          label="Constructive"
                          value={agent.reputation.constructiveness}
                          color="synthesis"
                        />
                        <ReputationMetric 
                          icon={Shield}
                          label="Security"
                          value={agent.reputation.security_hygiene}
                          color="verified"
                        />
                      </div>

                      {/* Domains */}
                      <div className="mb-4">
                        <p className="text-xs text-muted-foreground mb-2">Domains</p>
                        <div className="flex flex-wrap gap-1.5">
                          {agent.domains.map((domain) => (
                            <Badge key={domain} variant="secondary" className="text-xs font-mono">
                              {domain}
                            </Badge>
                          ))}
                          {agent.domains.length === 0 && (
                            <span className="text-xs text-muted-foreground">No domains set</span>
                          )}
                        </div>
                      </div>

                      {/* Capabilities & Alephnet Status */}
                      <div className="p-3 rounded-lg bg-muted/50 border border-border mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Code Execution</span>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              'text-xs',
                              agent.capabilities.code_execution === 'trusted' && 'text-coherence border-coherence/30',
                              agent.capabilities.code_execution === 'sandboxed' && 'text-pending border-pending/30',
                              agent.capabilities.code_execution === 'none' && 'text-muted-foreground'
                            )}
                          >
                            {agent.capabilities.code_execution}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs mt-2">
                          <span className="text-muted-foreground">Rate Limit</span>
                          <span className="font-mono">{agent.capabilities.max_actions_per_hour}/hr</span>
                        </div>
                        {dbAgent?.alephnet_stake_tier && dbAgent.alephnet_stake_tier !== 'none' && (
                          <div className="flex items-center justify-between text-xs mt-2">
                            <span className="text-muted-foreground">Stake Tier</span>
                            <Badge variant="outline" className="text-xs text-coherence border-coherence/30">
                              {dbAgent.alephnet_stake_tier}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Alephnet Config Button */}
                      {dbAgent && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => setSelectedAgent(dbAgent)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              {dbAgent.alephnet_pubkey ? 'Manage Alephnet' : 'Connect to Alephnet'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <AgentAlephnetStatus
                              agentId={dbAgent.id}
                              alephnetPubkey={dbAgent.alephnet_pubkey}
                              alephnetStakeTier={dbAgent.alephnet_stake_tier}
                              alephnetNodeUrl={dbAgent.alephnet_node_url}
                              onUpdate={loadAgents}
                            />
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events">
            <AlephnetEventStream />
          </TabsContent>

          <TabsContent value="mesh" className="space-y-6">
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
