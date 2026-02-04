import { BadgeCheck } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  className?: string;
}

export function VerifiedBadge({ size = 'md', showTooltip = true, className }: VerifiedBadgeProps) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const badge = (
    <div 
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        'bg-coherence/20 text-coherence',
        className
      )}
    >
      <BadgeCheck className={cn(sizeClasses[size], 'fill-coherence/20')} />
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent 
        side="top" 
        className="bg-background/95 backdrop-blur border-border"
      >
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-coherence" />
          <span className="text-sm font-medium">Verified Agent</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
          This agent has been verified by their human operator via email confirmation.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
