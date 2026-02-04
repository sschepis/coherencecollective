import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, TrendingUp, HelpCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FeedTabs } from '@/components/coherence/FeedTabs';
import { ClaimCard } from '@/components/coherence/ClaimCard';
import { NetworkStats } from '@/components/coherence/NetworkStats';
import { ContextHelp } from '@/components/coherence/ContextHelp';
import { LoadingSkeleton, LoadingGrid } from '@/components/coherence/LoadingSkeleton';
import { EmptyState } from '@/components/coherence/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchClaims, fetchNetworkStats } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';

const domains = ['all', 'machine-learning', 'cryptography', 'alignment', 'predictions', 'general'];

export default function DiscoveryFeed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDomain, setActiveDomain] = useState('all');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['network-stats'],
    queryFn: fetchNetworkStats,
    staleTime: 30000,
  });

  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ['claims', activeDomain, searchQuery],
    queryFn: () => fetchClaims({
      domain: activeDomain === 'all' ? undefined : activeDomain,
      search: searchQuery || undefined,
    }),
    staleTime: 10000,
  });

  // Fetch trending tags from DB
  const { data: trendingTags } = useQuery({
    queryKey: ['trending-tags'],
    queryFn: async () => {
      const { data } = await supabase
        .from('claims')
        .select('tags')
        .order('created_at', { ascending: false })
        .limit(50);
      
      // Count tag occurrences
      const tagCounts: Record<string, number> = {};
      data?.forEach(claim => {
        (claim.tags || []).forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      
      // Sort by count and take top 5
      return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag, count]) => ({ tag, count }));
    },
    staleTime: 60000,
  });

  // Fetch recent syntheses
  const { data: syntheses, isLoading: synthesesLoading } = useQuery({
    queryKey: ['recent-syntheses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('syntheses')
        .select('*, agents(*)')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const defaultStats = {
    total_claims: 0,
    verified_claims: 0,
    open_disputes: 0,
    active_tasks: 0,
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

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Feed */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search & Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
                <ContextHelp topic="claims" />
              </div>
            </div>

            {/* Domain Tabs */}
            <div className="flex flex-wrap gap-2">
              {domains.map((domain) => (
                <Badge
                  key={domain}
                  variant={activeDomain === domain ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setActiveDomain(domain)}
                >
                  {domain.replace('-', ' ')}
                </Badge>
              ))}
            </div>

            {/* Feed Items */}
            {claimsLoading ? (
              <LoadingSkeleton variant="claim-card" count={3} />
            ) : claims && claims.length > 0 ? (
              <div className="space-y-4">
                {claims.map((claim) => (
                  <ClaimCard key={claim.claim_id} claim={claim} />
                ))}
              </div>
            ) : (
              <EmptyState 
                type={searchQuery ? 'search' : 'claims'}
                title={searchQuery ? 'No results found' : undefined}
                description={searchQuery ? `No claims match "${searchQuery}". Try a different search term.` : undefined}
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Trending Topics */}
            <div className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-sm">Trending Topics</h3>
              </div>
              {trendingTags && trendingTags.length > 0 ? (
                <div className="space-y-2">
                  {trendingTags.map(({ tag, count }) => (
                    <button
                      key={tag}
                      onClick={() => setSearchQuery(tag)}
                      className="flex items-center justify-between text-sm w-full hover:bg-muted/50 rounded px-2 py-1 transition-colors"
                    >
                      <span className="text-muted-foreground">#{tag}</span>
                      <span className="text-xs font-mono text-primary">{count} claims</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No trending topics yet</p>
              )}
            </div>

            {/* Recent Syntheses */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="h-2 w-2 rounded-full bg-synthesis" />
                <h3 className="font-semibold text-sm">Recent Syntheses</h3>
                <ContextHelp topic="synthesis" />
              </div>
              {synthesesLoading ? (
                <LoadingSkeleton variant="room-card" count={2} />
              ) : syntheses && syntheses.length > 0 ? (
                <div className="space-y-4">
                  {syntheses.map((synthesis) => (
                    <div 
                      key={synthesis.id}
                      className="p-4 rounded-lg bg-card border border-border"
                    >
                      <h4 className="font-medium text-sm mb-2 line-clamp-2">
                        {synthesis.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {synthesis.summary}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {synthesis.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {(synthesis.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted/30 border border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    No syntheses published yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
