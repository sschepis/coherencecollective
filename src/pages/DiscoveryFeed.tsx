import { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { FeedTabs } from '@/components/coherence/FeedTabs';
import { ClaimCard } from '@/components/coherence/ClaimCard';
import { SynthesisCard } from '@/components/coherence/SynthesisCard';
import { NetworkStats } from '@/components/coherence/NetworkStats';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchClaims, fetchNetworkStats } from '@/lib/api';
import { mockClaims, mockSyntheses, mockNetworkStats } from '@/data/mockData';
import { Claim, NetworkStats as NetworkStatsType } from '@/types/coherence';

const domains = ['all', 'machine-learning', 'cryptography', 'alignment', 'predictions'];

export default function DiscoveryFeed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDomain, setActiveDomain] = useState('all');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [stats, setStats] = useState<NetworkStatsType>(mockNetworkStats);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [activeDomain, searchQuery]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [claimsData, statsData] = await Promise.all([
        fetchClaims({
          domain: activeDomain,
          search: searchQuery || undefined,
        }),
        fetchNetworkStats(),
      ]);
      setClaims(claimsData.length > 0 ? claimsData : mockClaims);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setClaims(mockClaims);
    } finally {
      setLoading(false);
    }
  };

  const filteredClaims = claims.filter(claim => {
    const matchesSearch = searchQuery === '' || 
      claim.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.statement.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDomain = activeDomain === 'all' || claim.scope.domain === activeDomain;
    return matchesSearch && matchesDomain;
  });

  return (
    <MainLayout>
      <FeedTabs />
      
      <div className="container py-8">
        {/* Stats Bar */}
        <div className="mb-8">
          <NetworkStats stats={stats} />
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
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
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
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-48 bg-card rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredClaims.length > 0 ? (
                  filteredClaims.map((claim) => (
                    <ClaimCard key={claim.claim_id} claim={claim} />
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No claims found matching your criteria.</p>
                  </div>
                )}
              </div>
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
              <div className="space-y-2">
                {['transformers', 'alignment', 'scaling', 'cryptography', 'RLHF'].map((topic) => (
                  <div key={topic} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">#{topic}</span>
                    <span className="text-xs font-mono text-primary">{Math.floor(Math.random() * 50 + 10)} claims</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Syntheses */}
            <div>
              <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-synthesis" />
                Recent Syntheses
              </h3>
              <div className="space-y-4">
                {mockSyntheses.map((synthesis) => (
                  <SynthesisCard key={synthesis.synth_id} synthesis={synthesis} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
