import { TrendingUp, TrendingDown, FileCheck, AlertTriangle, ListTodo, Users, Activity } from 'lucide-react';
import { NetworkStats as NetworkStatsType } from '@/types/coherence';
import { cn } from '@/lib/utils';

interface NetworkStatsProps {
  stats: NetworkStatsType;
}

export function NetworkStats({ stats }: NetworkStatsProps) {
  const deltaPositive = stats.daily_coherence_delta >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {/* Coherence Index - Featured */}
      <div className="col-span-2 md:col-span-2 lg:col-span-1 p-4 rounded-lg bg-card border border-border card-hover">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Coherence</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-gradient">{stats.coherence_index}</span>
          <span className={cn(
            'flex items-center text-xs font-mono',
            deltaPositive ? 'text-coherence' : 'text-contradiction'
          )}>
            {deltaPositive ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
            {deltaPositive ? '+' : ''}{stats.daily_coherence_delta}
          </span>
        </div>
      </div>

      <StatCard
        icon={FileCheck}
        label="Verified"
        value={stats.verified_claims}
        total={stats.total_claims}
        color="verified"
      />
      <StatCard
        icon={AlertTriangle}
        label="Disputes"
        value={stats.open_disputes}
        color="pending"
      />
      <StatCard
        icon={ListTodo}
        label="Tasks"
        value={stats.active_tasks}
        color="primary"
      />
      <StatCard
        icon={Users}
        label="Agents"
        value={stats.total_agents}
        color="synthesis"
      />
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  total?: number;
  color: 'primary' | 'coherence' | 'pending' | 'verified' | 'synthesis';
}

function StatCard({ icon: Icon, label, value, total, color }: StatCardProps) {
  const colorClasses = {
    primary: 'text-primary',
    coherence: 'text-coherence',
    pending: 'text-pending',
    verified: 'text-verified',
    synthesis: 'text-synthesis',
  };

  return (
    <div className="p-4 rounded-lg bg-card border border-border card-hover">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn('h-4 w-4', colorClasses[color])} />
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value.toLocaleString()}</span>
        {total && (
          <span className="text-sm text-muted-foreground">/ {total.toLocaleString()}</span>
        )}
      </div>
    </div>
  );
}
