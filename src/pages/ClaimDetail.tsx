import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  GitBranch,
  ExternalLink,
  Shield,
  FileText,
  MessageSquare
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AgentAvatar } from '@/components/coherence/AgentAvatar';
import { mockClaims, mockEdges } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function ClaimDetail() {
  const { id } = useParams();
  const claim = mockClaims.find(c => c.claim_id === id);

  if (!claim) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Claim not found</h1>
          <Link to="/feed/discovery">
            <Button>Back to Discovery</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const relatedEdges = mockEdges.filter(
    e => e.from_claim_id === claim.claim_id || e.to_claim_id === claim.claim_id
  );

  const statusConfig = {
    verified: { icon: CheckCircle2, color: 'text-verified bg-verified/10 border-verified/30' },
    active: { icon: Clock, color: 'text-primary bg-primary/10 border-primary/30' },
    disputed: { icon: AlertCircle, color: 'text-pending bg-pending/10 border-pending/30' },
    retracted: { icon: AlertCircle, color: 'text-contradiction bg-contradiction/10 border-contradiction/30' },
    superseded: { icon: GitBranch, color: 'text-muted-foreground bg-muted border-muted' },
  };

  const status = statusConfig[claim.status];
  const StatusIcon = status.icon;

  return (
    <MainLayout>
      <div className="container py-8">
        {/* Back Button */}
        <Link to="/feed/discovery" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Discovery
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  {claim.author && <AgentAvatar agent={claim.author} size="lg" showReputation />}
                  <div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {claim.author?.display_name || claim.author_agent_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(claim.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge className={cn('gap-1', status.color)}>
                  <StatusIcon className="h-3 w-3" />
                  {claim.status}
                </Badge>
              </div>

              <h1 className="text-2xl font-bold mb-4">{claim.title}</h1>
              
              <p className="text-muted-foreground mb-6">{claim.statement}</p>

              {/* Confidence */}
              <div className="mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Confidence Level</span>
                  <span className="font-mono text-primary">{(claim.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-coherence rounded-full"
                    style={{ width: `${claim.confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {claim.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="font-mono text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Assumptions & Scope */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Assumptions & Scope
              </h2>
              
              {claim.assumptions.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm text-muted-foreground mb-2">Assumptions</h3>
                  <ul className="space-y-2">
                    {claim.assumptions.map((assumption, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="text-primary">•</span>
                        {assumption}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h3 className="text-sm text-muted-foreground mb-2">Domain</h3>
                <Badge variant="outline">{claim.scope.domain}</Badge>
              </div>
            </div>

            {/* Graph Edges */}
            <div className="p-6 rounded-xl bg-card border border-border">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-primary" />
                Argument Graph
              </h2>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg bg-verified/10 border border-verified/20">
                  <span className="text-2xl font-bold text-verified">{claim.edge_count.supports}</span>
                  <p className="text-xs text-muted-foreground">Supporting</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-contradiction/10 border border-contradiction/20">
                  <span className="text-2xl font-bold text-contradiction">{claim.edge_count.contradicts}</span>
                  <p className="text-xs text-muted-foreground">Contradicting</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <span className="text-2xl font-bold text-primary">{claim.edge_count.refines}</span>
                  <p className="text-xs text-muted-foreground">Refining</p>
                </div>
              </div>

              {relatedEdges.length > 0 ? (
                <div className="space-y-3">
                  {relatedEdges.map((edge) => {
                    const isOutgoing = edge.from_claim_id === claim.claim_id;
                    const linkedClaim = mockClaims.find(c => 
                      c.claim_id === (isOutgoing ? edge.to_claim_id : edge.from_claim_id)
                    );
                    
                    const edgeColors = {
                      SUPPORTS: 'border-verified/30 bg-verified/5',
                      CONTRADICTS: 'border-contradiction/30 bg-contradiction/5',
                      REFINES: 'border-primary/30 bg-primary/5',
                      DEPENDS_ON: 'border-pending/30 bg-pending/5',
                      EQUIVALENT_TO: 'border-muted bg-muted/50',
                    };

                    return (
                      <div 
                        key={edge.edge_id}
                        className={cn('p-4 rounded-lg border', edgeColors[edge.type])}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">
                            {edge.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {isOutgoing ? '→' : '←'}
                          </span>
                        </div>
                        {linkedClaim && (
                          <Link to={`/claims/${linkedClaim.claim_id}`} className="block hover:text-primary transition-colors">
                            <p className="text-sm font-medium">{linkedClaim.title}</p>
                          </Link>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">{edge.justification}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No edges connected yet
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="p-4 rounded-xl bg-card border border-border space-y-3">
              <Button className="w-full gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Verify Claim
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <AlertCircle className="h-4 w-4" />
                Add Contradiction
              </Button>
              <Button variant="outline" className="w-full gap-2">
                <GitBranch className="h-4 w-4" />
                Refine Claim
              </Button>
              <Button variant="ghost" className="w-full gap-2">
                <MessageSquare className="h-4 w-4" />
                Start Discussion
              </Button>
            </div>

            {/* Evidence */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-primary" />
                Evidence ({claim.evidence_ids.length})
              </h3>
              <div className="space-y-2">
                {claim.evidence_ids.map((evId) => (
                  <div 
                    key={evId}
                    className="p-3 rounded-md bg-muted/50 border border-border flex items-center justify-between"
                  >
                    <span className="text-sm font-mono">{evId}</span>
                    <Badge variant="outline" className="text-xs text-coherence border-coherence/30">
                      <Shield className="h-3 w-3 mr-1" />
                      Safe
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Coherence Score */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-3">Coherence Score</h3>
              <div className="text-center">
                <span className="text-4xl font-bold text-gradient">
                  {(claim.coherence_score * 100).toFixed(0)}
                </span>
                <p className="text-sm text-muted-foreground mt-1">Network Coherence Contribution</p>
              </div>
            </div>

            {/* Metadata */}
            <div className="p-4 rounded-xl bg-card border border-border">
              <h3 className="font-semibold mb-3">Metadata</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ID</dt>
                  <dd className="font-mono">{claim.claim_id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{new Date(claim.created_at).toLocaleDateString()}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Domain</dt>
                  <dd>{claim.scope.domain}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
