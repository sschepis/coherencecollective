import { useState, useEffect } from 'react';
import { Filter, Zap, Clock, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FeedTabs } from '@/components/coherence/FeedTabs';
import { TaskCard } from '@/components/coherence/TaskCard';
import { NetworkStats } from '@/components/coherence/NetworkStats';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchTasks, claimTask, fetchNetworkStats } from '@/lib/api';
import { mockTasks, mockNetworkStats } from '@/data/mockData';
import { Task, NetworkStats as NetworkStatsType } from '@/types/coherence';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const taskTypes = ['all', 'VERIFY', 'COUNTEREXAMPLE', 'SYNTHESIZE', 'SECURITY_REVIEW', 'TRACE_REPRO'];
const statusFilters = ['all', 'open', 'claimed', 'in_progress'];

export default function CoherenceWorkFeed() {
  const [activeType, setActiveType] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'priority' | 'reward' | 'recent'>('priority');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<NetworkStatsType>(mockNetworkStats);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, [activeType, activeStatus]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksData, statsData] = await Promise.all([
        fetchTasks({
          type: activeType,
          status: activeStatus,
        }),
        fetchNetworkStats(),
      ]);
      setTasks(tasksData.length > 0 ? tasksData : mockTasks);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks(mockTasks);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimTask = async (taskId: string) => {
    if (!user) {
      toast.error('Please sign in to claim tasks');
      return;
    }

    try {
      await claimTask(taskId);
      toast.success(`Task claimed!`, {
        description: 'You can now start working on this task.',
      });
      loadData(); // Refresh tasks
    } catch (error: any) {
      toast.error('Failed to claim task', { description: error.message });
    }
  };

  const sortedTasks = [...tasks]
    .filter(task => {
      const matchesType = activeType === 'all' || task.type === activeType;
      const matchesStatus = activeStatus === 'all' || task.status === activeStatus;
      return matchesType && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return b.priority - a.priority;
      if (sortBy === 'reward') return b.coherence_reward - a.coherence_reward;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const openTasks = tasks.filter(t => t.status === 'open').length;
  const totalReward = tasks.filter(t => t.status === 'open').reduce((sum, t) => sum + t.coherence_reward, 0);

  return (
    <MainLayout>
      <FeedTabs />
      
      <div className="container py-8">
        {/* Stats Bar */}
        <div className="mb-8">
          <NetworkStats stats={stats} />
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
            <span className="text-2xl font-bold">
              {openTasks > 0 ? (tasks.filter(t => t.status === 'open').reduce((sum, t) => sum + t.priority, 0) / openTasks * 100).toFixed(0) : 0}%
            </span>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Filter className="h-4 w-4" />
              <span className="text-xs">Your Matches</span>
            </div>
            <span className="text-2xl font-bold text-pending">{Math.floor(openTasks * 0.6)}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
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
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
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
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-64 bg-card rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedTasks.length > 0 ? (
              sortedTasks.map((task) => (
                <TaskCard 
                  key={task.task_id} 
                  task={task} 
                  onClaim={handleClaimTask}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>No tasks found matching your criteria.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
