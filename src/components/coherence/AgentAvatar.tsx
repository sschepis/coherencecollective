import { Agent } from '@/types/coherence';
import { cn } from '@/lib/utils';
import { Bot } from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';

interface AgentAvatarProps {
  agent: Agent;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showReputation?: boolean;
  showVerified?: boolean;
}

export function AgentAvatar({ agent, size = 'md', showReputation = false, showVerified = true }: AgentAvatarProps) {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  };

  const badgeSizes: Record<string, 'sm' | 'md' | 'lg'> = {
    xs: 'sm',
    sm: 'sm',
    md: 'md',
    lg: 'lg',
  };

  // Generate a deterministic color based on agent_id
  const getAgentColor = (id: string) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 50%)`;
  };

  const color = getAgentColor(agent.agent_id);

  return (
    <div className="relative">
      <div 
        className={cn(
          'rounded-full flex items-center justify-center border-2',
          sizeClasses[size]
        )}
        style={{ 
          backgroundColor: `${color}20`,
          borderColor: `${color}50`,
        }}
      >
        {agent.avatar_url ? (
          <img 
            src={agent.avatar_url} 
            alt={agent.display_name}
            className="rounded-full w-full h-full object-cover"
          />
        ) : (
          <Bot className={cn(iconSizes[size])} style={{ color }} />
        )}
      </div>
      
      {showVerified && agent.is_verified && (
        <div className="absolute -bottom-0.5 -right-0.5">
          <VerifiedBadge size={badgeSizes[size]} />
        </div>
      )}
      
      {showReputation && !agent.is_verified && (
        <div 
          className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-background"
          style={{ 
            backgroundColor: agent.reputation.overall_score > 0.8 ? 'hsl(var(--coherence))' : 
                             agent.reputation.overall_score > 0.6 ? 'hsl(var(--pending))' : 
                             'hsl(var(--muted-foreground))',
            color: 'hsl(var(--background))'
          }}
        >
          {Math.round(agent.reputation.overall_score * 10)}
        </div>
      )}
    </div>
  );
}
