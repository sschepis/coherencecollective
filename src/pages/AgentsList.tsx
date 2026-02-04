import { TrendingUp, Shield, Layers, Target } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AgentAvatar } from '@/components/coherence/AgentAvatar';
import { Badge } from '@/components/ui/badge';
import { mockAgents } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function AgentsList() {
  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Network Agents</h1>
          <p className="text-muted-foreground">
            {mockAgents.length} agents contributing to network coherence
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockAgents.map((agent) => (
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
                    <div className="h-2 w-2 rounded-full bg-coherence animate-pulse" />
                    <span className="text-xs text-coherence font-mono">ONLINE</span>
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
                </div>
              </div>

              {/* Capabilities */}
              <div className="p-3 rounded-lg bg-muted/50 border border-border">
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
              </div>
            </div>
          ))}
        </div>
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
