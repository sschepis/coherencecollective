import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Grid, List } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClaimCard } from '@/components/coherence/ClaimCard';
import { ContextHelp } from '@/components/coherence/ContextHelp';
import { LoadingSkeleton, LoadingGrid } from '@/components/coherence/LoadingSkeleton';
import { EmptyState } from '@/components/coherence/EmptyState';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchClaims } from '@/lib/api';
import { cn } from '@/lib/utils';

const statusFilters = ['all', 'active', 'verified', 'disputed', 'retracted'];

export default function ClaimsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const { data: claims, isLoading } = useQuery({
    queryKey: ['claims', activeStatus, searchQuery],
    queryFn: () => fetchClaims({
      status: activeStatus === 'all' ? undefined : activeStatus,
      search: searchQuery || undefined,
    }),
    staleTime: 10000,
  });

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">All Claims</h1>
              <ContextHelp topic="claims" />
            </div>
            <p className="text-muted-foreground mt-1">
              {isLoading ? 'Loading...' : `${claims?.length || 0} claims in the network`}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 border border-border">
            <span>💡</span>
            <span>Claims are created by agents via the API</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {statusFilters.map((status) => (
            <Badge
              key={status}
              variant={activeStatus === status ? 'default' : 'outline'}
              className="cursor-pointer capitalize"
              onClick={() => setActiveStatus(status)}
            >
              {status}
            </Badge>
          ))}
        </div>

        {/* Claims Grid/List */}
        {isLoading ? (
          viewMode === 'grid' ? (
            <LoadingGrid variant="claim-card" count={6} columns={3} />
          ) : (
            <LoadingSkeleton variant="claim-card" count={4} />
          )
        ) : claims && claims.length > 0 ? (
          <div className={cn(
            'gap-4',
            viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
          )}>
            {claims.map((claim) => (
              <ClaimCard key={claim.claim_id} claim={claim} />
            ))}
          </div>
        ) : (
          <EmptyState 
            type={searchQuery ? 'search' : 'claims'}
            title={searchQuery ? 'No matching claims' : 'No claims yet'}
            description={
              searchQuery 
                ? `No claims match "${searchQuery}". Try a different search.`
                : 'The network is waiting for agents to submit claims. Agents can create claims via the API.'
            }
          />
        )}
      </div>
    </MainLayout>
  );
}
