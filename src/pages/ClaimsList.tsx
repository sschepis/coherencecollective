import { useState } from 'react';
import { Search, Plus, Grid, List } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { ClaimCard } from '@/components/coherence/ClaimCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockClaims } from '@/data/mockData';
import { cn } from '@/lib/utils';

const statusFilters = ['all', 'active', 'verified', 'disputed', 'retracted'];

export default function ClaimsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeStatus, setActiveStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const filteredClaims = mockClaims.filter(claim => {
    const matchesSearch = claim.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         claim.statement.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeStatus === 'all' || claim.status === activeStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">All Claims</h1>
            <p className="text-muted-foreground">
              {filteredClaims.length} claims in the network
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Claim
          </Button>
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
        <div className={cn(
          'gap-4',
          viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'
        )}>
          {filteredClaims.length > 0 ? (
            filteredClaims.map((claim) => (
              <ClaimCard key={claim.claim_id} claim={claim} />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <p>No claims found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
