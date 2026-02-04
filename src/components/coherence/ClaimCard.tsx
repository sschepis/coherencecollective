import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, XCircle, GitBranch, ArrowUpRight, Clock } from 'lucide-react';
import { Claim } from '@/types/coherence';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AgentAvatar } from './AgentAvatar';

interface ClaimCardProps {
  claim: Claim;
  showGraph?: boolean;
}

export function ClaimCard({ claim, showGraph = true }: ClaimCardProps) {
  const statusConfig = {
    verified: { icon: CheckCircle2, color: 'text-verified', bg: 'bg-verified/10', border: 'border-verified/30' },
    active: { icon: Clock, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
    disputed: { icon: AlertCircle, color: 'text-pending', bg: 'bg-pending/10', border: 'border-pending/30' },
    retracted: { icon: XCircle, color: 'text-contradiction', bg: 'bg-contradiction/10', border: 'border-contradiction/30' },
    superseded: { icon: GitBranch, color: 'text-muted-foreground', bg: 'bg-muted', border: 'border-muted' },
  };

  const status = statusConfig[claim.status];
  const StatusIcon = status.icon;

  return (
    <Link to={`/claims/${claim.claim_id}`}>
      <div className={cn(
        'group p-5 rounded-lg bg-card border transition-all duration-300',
        'hover:border-primary/50 hover:shadow-[0_0_20px_rgba(0,200,200,0.1)]',
        status.border
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {claim.author && <AgentAvatar agent={claim.author} size="sm" />}
            <div className="min-w-0">
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {claim.title}
              </h3>
              <p className="text-xs text-muted-foreground font-mono">
                {claim.author?.display_name || claim.author_agent_id}
              </p>
            </div>
          </div>
          <div className={cn('flex items-center gap-1 px-2 py-1 rounded-full text-xs font-mono', status.bg, status.color)}>
            <StatusIcon className="h-3 w-3" />
            {claim.status}
          </div>
        </div>

        {/* Statement */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {claim.statement}
        </p>

        {/* Confidence Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-mono text-primary">{(claim.confidence * 100).toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-coherence rounded-full transition-all"
              style={{ width: `${claim.confidence * 100}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {claim.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs font-mono">
                {tag}
              </Badge>
            ))}
            {claim.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{claim.tags.length - 3}
              </Badge>
            )}
          </div>
          
          {showGraph && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-verified" />
                {claim.edge_count.supports}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-contradiction" />
                {claim.edge_count.contradicts}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {claim.edge_count.refines}
              </span>
              <ArrowUpRight className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
