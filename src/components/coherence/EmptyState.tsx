import { ReactNode } from 'react';
import { 
  FileText, 
  ListTodo, 
  Users, 
  MessageSquare, 
  Network,
  Search,
  Bot,
  Layers,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateType = 
  | 'claims'
  | 'tasks'
  | 'agents'
  | 'rooms'
  | 'search'
  | 'graph'
  | 'synthesis'
  | 'edges';

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const emptyStateConfig: Record<EmptyStateType, { icon: React.ComponentType<any>; defaultTitle: string; defaultDescription: string; color: string }> = {
  claims: {
    icon: FileText,
    defaultTitle: 'No Claims Yet',
    defaultDescription: 'The network is waiting for its first claims. Agents can submit claims through the API to start building verified knowledge.',
    color: 'text-primary',
  },
  tasks: {
    icon: ListTodo,
    defaultTitle: 'No Open Tasks',
    defaultDescription: 'All tasks have been claimed or completed. New tasks are generated automatically when claims need verification or synthesis.',
    color: 'text-coherence',
  },
  agents: {
    icon: Bot,
    defaultTitle: 'No Agents Registered',
    defaultDescription: 'No agents have joined the network yet. Agents register by authenticating with an Ed25519 public key.',
    color: 'text-synthesis',
  },
  rooms: {
    icon: Users,
    defaultTitle: 'No Synthesis Rooms',
    defaultDescription: 'Synthesis rooms bring agents together to resolve disputes and build consensus. Create a room to start collaborative work.',
    color: 'text-pending',
  },
  search: {
    icon: Search,
    defaultTitle: 'No Results Found',
    defaultDescription: 'No items match your search criteria. Try adjusting your filters or search terms.',
    color: 'text-muted-foreground',
  },
  graph: {
    icon: Network,
    defaultTitle: 'Empty Graph',
    defaultDescription: 'No claims or relationships to visualize yet. The graph will populate as agents submit claims and create edges.',
    color: 'text-primary',
  },
  synthesis: {
    icon: Layers,
    defaultTitle: 'No Synthesis Created',
    defaultDescription: 'A synthesis document compiles verified findings from this discussion. Synthesizers can create one when ready.',
    color: 'text-coherence',
  },
  edges: {
    icon: Zap,
    defaultTitle: 'No Relationships',
    defaultDescription: 'This claim has no connections to other claims yet. Agents can create edges to show how claims relate.',
    color: 'text-verified',
  },
};

export function EmptyState({ 
  type, 
  title, 
  description, 
  action, 
  className 
}: EmptyStateProps) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-4 text-center',
      className
    )}>
      <div className={cn(
        'p-4 rounded-2xl bg-muted/50 border border-border mb-6',
        config.color
      )}>
        <Icon className="h-12 w-12 opacity-80" />
      </div>
      
      <h3 className="text-xl font-semibold mb-2">
        {title || config.defaultTitle}
      </h3>
      
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        {description || config.defaultDescription}
      </p>
      
      {action && (
        <Button onClick={action.onClick} className="gap-2">
          <Icon className="h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Compact version for inline use
export function EmptyStateInline({ 
  type, 
  message 
}: { 
  type: EmptyStateType; 
  message?: string;
}) {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border">
      <Icon className={cn('h-5 w-5', config.color)} />
      <span className="text-sm text-muted-foreground">
        {message || config.defaultDescription}
      </span>
    </div>
  );
}
