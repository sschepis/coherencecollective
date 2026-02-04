import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  GitCompare, 
  Database, 
  Search,
  Shield,
  Layers,
  ArrowRight,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SemanticAction {
  skill: string;
  action: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const semanticActions: Record<string, SemanticAction> = {
  'VERIFY': {
    skill: 'semantic',
    action: 'think_and_compare',
    description: 'Analyze claim validity and compare with existing knowledge',
    icon: GitCompare,
    color: 'text-verified bg-verified/10 border-verified/30',
  },
  'COUNTEREXAMPLE': {
    skill: 'semantic',
    action: 'adversarial_think',
    description: 'Generate adversarial scenarios to test claim robustness',
    icon: Search,
    color: 'text-disputed bg-disputed/10 border-disputed/30',
  },
  'SYNTHESIZE': {
    skill: 'semantic',
    action: 'aggregate_and_remember',
    description: 'Combine multiple claims into coherent synthesis',
    icon: Layers,
    color: 'text-synthesis bg-synthesis/10 border-synthesis/30',
  },
  'SECURITY_REVIEW': {
    skill: 'safety',
    action: 'classify_risks',
    description: 'Evaluate security implications and potential risks',
    icon: Shield,
    color: 'text-pending bg-pending/10 border-pending/30',
  },
  'TRACE_REPRO': {
    skill: 'execution',
    action: 'reproduce_steps',
    description: 'Trace and reproduce execution steps for verification',
    icon: Zap,
    color: 'text-primary bg-primary/10 border-primary/30',
  },
};

interface SemanticActionRouterProps {
  showHeader?: boolean;
  className?: string;
}

export function SemanticActionRouter({ showHeader = true, className }: SemanticActionRouterProps) {
  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-coherence" />
            Semantic Action Router
          </CardTitle>
          <CardDescription>
            Maps Coherence tasks to Alephnet skill actions
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className={cn(!showHeader && 'pt-6')}>
        <div className="space-y-3">
          {Object.entries(semanticActions).map(([taskType, action]) => (
            <ActionMapping key={taskType} taskType={taskType} action={action} />
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-2 mb-4">
            <Database className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Skill Categories</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <SkillBadge skill="semantic" count={3} />
            <SkillBadge skill="safety" count={1} />
            <SkillBadge skill="execution" count={1} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionMapping({ taskType, action }: { taskType: string; action: SemanticAction }) {
  const Icon = action.icon;
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border hover:border-primary/30 transition-colors">
      <div className={cn('p-2 rounded-lg border', action.color)}>
        <Icon className="h-4 w-4" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-mono">
            {taskType}
          </Badge>
          <ArrowRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-mono text-coherence">
            {action.skill}.{action.action}()
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 truncate">
          {action.description}
        </p>
      </div>
    </div>
  );
}

function SkillBadge({ skill, count }: { skill: string; count: number }) {
  const skillColors: Record<string, string> = {
    semantic: 'bg-coherence/10 text-coherence border-coherence/30',
    safety: 'bg-pending/10 text-pending border-pending/30',
    execution: 'bg-primary/10 text-primary border-primary/30',
  };

  return (
    <div className={cn(
      'px-3 py-2 rounded-lg border text-center',
      skillColors[skill] || 'bg-muted text-muted-foreground border-border'
    )}>
      <p className="text-xs font-mono">{skill}</p>
      <p className="text-lg font-bold">{count}</p>
    </div>
  );
}

// Export the mapping function for use in other components
export function mapTaskToAlephnetAction(taskType: string): { skill: string; action: string } {
  const mapping = semanticActions[taskType];
  return mapping 
    ? { skill: mapping.skill, action: mapping.action }
    : { skill: 'semantic', action: 'think' };
}
