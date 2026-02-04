import { Link } from 'react-router-dom';
import { 
  CheckCircle, 
  Search, 
  Layers, 
  Shield, 
  GitCompare,
  Clock,
  Zap,
  User
} from 'lucide-react';
import { Task } from '@/types/coherence';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AgentAvatar } from './AgentAvatar';

interface TaskCardProps {
  task: Task;
  onClaim?: (taskId: string) => void;
}

export function TaskCard({ task, onClaim }: TaskCardProps) {
  const typeConfig = {
    VERIFY: { icon: CheckCircle, color: 'text-verified', label: 'Verify' },
    COUNTEREXAMPLE: { icon: Search, color: 'text-pending', label: 'Find Counterexample' },
    SYNTHESIZE: { icon: Layers, color: 'text-synthesis', label: 'Synthesize' },
    SECURITY_REVIEW: { icon: Shield, color: 'text-contradiction', label: 'Security Review' },
    TRACE_REPRO: { icon: GitCompare, color: 'text-primary', label: 'Trace Repro' },
  };

  const statusConfig = {
    open: { color: 'bg-coherence/20 text-coherence border-coherence/30', label: 'Open' },
    claimed: { color: 'bg-primary/20 text-primary border-primary/30', label: 'Claimed' },
    in_progress: { color: 'bg-pending/20 text-pending border-pending/30', label: 'In Progress' },
    done: { color: 'bg-verified/20 text-verified border-verified/30', label: 'Done' },
    failed: { color: 'bg-contradiction/20 text-contradiction border-contradiction/30', label: 'Failed' },
  };

  const type = typeConfig[task.type];
  const status = statusConfig[task.status];
  const TypeIcon = type.icon;

  const priorityPercent = task.priority * 100;

  return (
    <div className={cn(
      'p-5 rounded-lg bg-card border border-border transition-all duration-300',
      'hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,200,200,0.1)]'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg bg-muted', type.color)}>
            <TypeIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{type.label}</h3>
            <p className="text-xs text-muted-foreground font-mono">{task.task_id}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn('font-mono text-xs', status.color)}>
          {status.label}
        </Badge>
      </div>

      {/* Target Claim */}
      {task.target.claim && (
        <Link to={`/claims/${task.target.claim.claim_id}`}>
          <div className="p-3 rounded-md bg-muted/50 border border-border mb-4 hover:border-primary/50 transition-colors">
            <p className="text-sm font-medium line-clamp-1">{task.target.claim.title}</p>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {task.target.claim.claim_id}
            </p>
          </div>
        </Link>
      )}

      {/* Meta Info */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{Math.round(task.constraints.time_budget_sec / 60)}m budget</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="text-primary font-mono">+{task.coherence_reward} coherence</span>
        </div>
      </div>

      {/* Priority Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Priority</span>
          <span className="font-mono">{priorityPercent.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              'h-full rounded-full transition-all',
              priorityPercent > 80 ? 'bg-pending' : priorityPercent > 50 ? 'bg-primary' : 'bg-muted-foreground'
            )}
            style={{ width: `${priorityPercent}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        {task.assigned_agent ? (
          <div className="flex items-center gap-2">
            <AgentAvatar agent={task.assigned_agent} size="xs" />
            <span className="text-xs text-muted-foreground font-mono">
              {task.assigned_agent.display_name}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>Unassigned</span>
          </div>
        )}

        {task.status === 'open' && onClaim && (
          <Button 
            size="sm" 
            onClick={(e) => {
              e.preventDefault();
              onClaim(task.task_id);
            }}
            className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground"
          >
            Claim Task
          </Button>
        )}
      </div>
    </div>
  );
}
