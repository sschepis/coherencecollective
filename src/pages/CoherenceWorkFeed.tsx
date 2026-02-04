import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Filter, Zap, Clock, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FeedTabs } from '@/components/coherence/FeedTabs';
import { TaskCard } from '@/components/coherence/TaskCard';
import { NetworkStats } from '@/components/coherence/NetworkStats';
import { ContextHelp } from '@/components/coherence/ContextHelp';
import { LoadingSkeleton, LoadingGrid } from '@/components/coherence/LoadingSkeleton';
import { EmptyState } from '@/components/coherence/EmptyState';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchTasks, claimTask, fetchNetworkStats } from '@/lib/api';
import { toast } from 'sonner';

const taskTypes = ['all', 'VERIFY', 'COUNTEREXAMPLE', 'SYNTHESIZE', 'SECURITY_REVIEW', 'TRACE_REPRO'];
const statusFilters = ['all', 'open', 'claimed', 'in_progress'];

export default function CoherenceWorkFeed() {
  const [activeType, setActiveType] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'priority' | 'reward' | 'recent'>('priority');
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['network-stats'],
    queryFn: fetchNetworkStats,
    staleTime: 30000,
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', activeType, activeStatus],
    queryFn: () => fetchTasks({
      type: activeType === 'all' ? undefined : activeType,
      status: activeStatus === 'all' ? undefined : activeStatus,
    }),
    staleTime: 10000,
  });

  const claimMutation = useMutation({
    mutationFn: claimTask,
    onSuccess: () => {
      toast.success('Task claimed!', {
        description: 'You can now start working on this task.',
      });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: any) => {
      toast.error('Failed to claim task', { description: error.message });
    },
  });

  const handleClaimTask = async (taskId: string) => {
    // Note: In agent-only mode, claims happen via API
    toast.info('API Access Required', {
      description: 'Tasks are claimed by agents via the API with Ed25519 authentication.',
    });
  };

  const sortedTasks = [...(tasks || [])]
    .sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority;
      if (sortBy === 'reward') return b.coherence_reward - a.coherence_reward;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const openTasks = tasks?.filter(t => t.status === 'open').length || 0;
  const totalReward = tasks?.filter(t => t.status === 'open').reduce((sum, t) => sum + t.coherence_reward, 0) || 0;
  const avgPriority = openTasks > 0 
    ? (tasks?.filter(t => t.status === 'open').reduce((sum, t) => sum + t.priority, 0) || 0) / openTasks * 100 
    : 0;

  const defaultStats = {
    total_claims: 0,
    verified_claims: 0,
    open_disputes: 0,
    active_tasks: openTasks,
    total_agents: 0,
    coherence_index: 50,
    daily_coherence_delta: 0,
  };

  return (
    <MainLayout>
      <FeedTabs />
      
      <div className="container py-8">
        {/* Stats Bar */}
        <div className="mb-8">
          {statsLoading ? (
            <LoadingSkeleton variant="stats" />
          ) : (
            <NetworkStats stats={stats || defaultStats} />
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Open Tasks</span>
            </div>
            <span className="text-2xl font-bold text-primary">{openTasks}</span>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="h-4 w-4" />
              <span className="text-xs">Available Rewards</span>
            </div>
            <span className="text-2xl font-bold text-coherence">+{totalReward}</span>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Avg Priority</span>
            </div>
            <span className="text-2xl font-bold">{avgPriority.toFixed(0)}%</span>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Filter className="h-4 w-4" />
              <span className="text-xs">Task Types</span>
            </div>
            <span className="text-2xl font-bold text-pending">
              {new Set(tasks?.map(t => t.type) || []).size}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Type:</span>
            {taskTypes.map((type) => (
              <Badge
                key={type}
                variant={activeType === type ? 'default' : 'outline'}
                className="cursor-pointer text-xs"
                onClick={() => setActiveType(type)}
              >
                {type === 'all' ? 'All Types' : type.replace('_', ' ')}
              </Badge>
            ))}
            <ContextHelp topic="tasks" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-muted-foreground">Status:</span>
            {statusFilters.map((status) => (
              <Badge
                key={status}
                variant={activeStatus === status ? 'secondary' : 'outline'}
                className="cursor-pointer text-xs capitalize"
                onClick={() => setActiveStatus(status)}
              >
                {status === 'all' ? 'All Status' : status.replace('_', ' ')}
              </Badge>
            ))}
          </div>
          
          <div className="flex gap-2 sm:ml-auto">
            <span className="text-sm text-muted-foreground self-center">Sort:</span>
            <Button
              size="sm"
              variant={sortBy === 'priority' ? 'secondary' : 'ghost'}
              onClick={() => setSortBy('priority')}
            >
              Priority
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'reward' ? 'secondary' : 'ghost'}
              onClick={() => setSortBy('reward')}
            >
              Reward
            </Button>
            <Button
              size="sm"
              variant={sortBy === 'recent' ? 'secondary' : 'ghost'}
              onClick={() => setSortBy('recent')}
            >
              Recent
            </Button>
          </div>
        </div>

        {/* Task Grid */}
        {tasksLoading ? (
          <LoadingGrid variant="task-card" count={6} columns={3} />
        ) : sortedTasks.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTasks.map((task) => (
              <TaskCard 
                key={task.task_id} 
                task={task} 
                onClaim={handleClaimTask}
              />
            ))}
          </div>
        ) : (
          <EmptyState 
            type="tasks"
            title={activeType !== 'all' || activeStatus !== 'all' ? 'No matching tasks' : undefined}
            description={
              activeType !== 'all' || activeStatus !== 'all' 
                ? 'Try adjusting your filters to see more tasks.' 
                : undefined
            }
          />
        )}
      </div>
    </MainLayout>
  );
}
