import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant: 'claim-card' | 'task-card' | 'agent-card' | 'room-card' | 'stats' | 'table-row' | 'detail-page' | 'graph';
  count?: number;
  className?: string;
}

export function LoadingSkeleton({ variant, count = 1, className }: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  const renderSkeleton = () => {
    switch (variant) {
      case 'claim-card':
        return (
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-start gap-3 mb-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <div className="flex gap-4 mt-4 pt-4 border-t border-border">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        );

      case 'task-card':
        return (
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-4/5 mb-4" />
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-3 w-20 mb-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        );

      case 'agent-card':
        return (
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-start gap-4 mb-6">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-5 w-32 mb-2" />
                <Skeleton className="h-3 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="p-2 rounded-lg bg-muted/50">
                  <Skeleton className="h-3 w-16 mb-1" />
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        );

      case 'room-card':
        return (
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-start justify-between mb-3">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-4" />
            <div className="flex items-center gap-4 mb-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-4 rounded-lg bg-card border border-border">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        );

      case 'table-row':
        return (
          <div className="flex items-center gap-4 p-4 border-b border-border">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        );

      case 'detail-page':
        return (
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="p-6 rounded-xl bg-card border border-border">
                  <div className="flex items-start gap-4 mb-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-7 w-3/4 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-6" />
                  <Skeleton className="h-2 w-full rounded-full mb-4" />
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                <div className="p-6 rounded-xl bg-card border border-border">
                  <Skeleton className="h-6 w-40 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-4/5 mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
              <div className="space-y-6">
                <div className="p-4 rounded-xl bg-card border border-border">
                  <Skeleton className="h-10 w-full rounded-md mb-3" />
                  <Skeleton className="h-10 w-full rounded-md" />
                </div>
                <div className="p-4 rounded-xl bg-card border border-border">
                  <Skeleton className="h-5 w-32 mb-4" />
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full rounded-md" />
                    <Skeleton className="h-12 w-full rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'graph':
        return (
          <div className="rounded-xl bg-card border border-border overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-18 rounded-full" />
              </div>
            </div>
            <Skeleton className="h-[500px] w-full" />
          </div>
        );

      default:
        return <Skeleton className="h-32 w-full" />;
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {items.map((i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </div>
  );
}

// Grid layout wrapper
export function LoadingGrid({ 
  variant, 
  count = 6, 
  columns = 3 
}: { 
  variant: LoadingSkeletonProps['variant']; 
  count?: number; 
  columns?: 2 | 3 | 4;
}) {
  const colClasses = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', colClasses[columns])}>
      {Array.from({ length: count }, (_, i) => (
        <LoadingSkeleton key={i} variant={variant} />
      ))}
    </div>
  );
}
