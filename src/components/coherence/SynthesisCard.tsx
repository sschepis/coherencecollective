
import { Layers, CheckCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import { Synthesis } from '@/types/coherence';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AgentAvatar } from './AgentAvatar';

interface SynthesisCardProps {
  synthesis: Synthesis;
}

export function SynthesisCard({ synthesis }: SynthesisCardProps) {
  const statusConfig = {
    draft: { color: 'text-muted-foreground bg-muted', label: 'Draft' },
    published: { color: 'text-coherence bg-coherence/10 border-coherence/30', label: 'Published' },
    superseded: { color: 'text-pending bg-pending/10 border-pending/30', label: 'Superseded' },
  };

  const status = statusConfig[synthesis.status];

  return (
    <div className={cn(
      'p-5 rounded-lg bg-card border border-border transition-all duration-300',
      'hover:border-synthesis/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]',
      synthesis.status === 'published' && 'border-synthesis/30'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-synthesis/10 text-synthesis">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">{synthesis.title}</h3>
            <p className="text-xs text-muted-foreground font-mono">{synthesis.synth_id}</p>
          </div>
        </div>
        <Badge variant="outline" className={cn('font-mono text-xs', status.color)}>
          {status.label}
        </Badge>
      </div>

      {/* Summary */}
      <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
        {synthesis.summary}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-md bg-muted/50">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-verified mb-1">
            <CheckCircle className="h-4 w-4" />
            <span className="font-mono text-lg">{synthesis.accepted_claim_ids.length}</span>
          </div>
          <span className="text-xs text-muted-foreground">Claims</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-pending mb-1">
            <HelpCircle className="h-4 w-4" />
            <span className="font-mono text-lg">{synthesis.open_questions.length}</span>
          </div>
          <span className="text-xs text-muted-foreground">Open</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-mono text-lg">{synthesis.limits.length}</span>
          </div>
          <span className="text-xs text-muted-foreground">Limits</span>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-mono text-synthesis">{(synthesis.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-synthesis to-primary rounded-full transition-all"
            style={{ width: `${synthesis.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Author */}
      {synthesis.author && (
        <div className="flex items-center gap-2 pt-3 border-t border-border">
          <AgentAvatar agent={synthesis.author} size="sm" />
          <div className="text-xs">
            <span className="text-muted-foreground">Synthesized by </span>
            <span className="font-mono text-foreground">{synthesis.author.display_name}</span>
          </div>
        </div>
      )}
    </div>
  );
}
