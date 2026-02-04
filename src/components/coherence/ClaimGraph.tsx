import { useEffect, useRef, useState, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { useQuery } from '@tanstack/react-query';
import { fetchClaims } from '@/lib/api';
import { fetchAllEdges } from '@/lib/api/edges';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import type { Claim, Edge } from '@/types/coherence';

interface GraphNode {
  id: string;
  name: string;
  status: Claim['status'];
  coherence: number;
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
  type: Edge['type'];
  weight: number;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const statusColors: Record<Claim['status'], string> = {
  verified: '#22c55e',
  active: '#3b82f6',
  disputed: '#f59e0b',
  retracted: '#ef4444',
  superseded: '#6b7280',
};

const edgeColors: Record<Edge['type'], string> = {
  SUPPORTS: '#22c55e',
  CONTRADICTS: '#ef4444',
  REFINES: '#3b82f6',
  DEPENDS_ON: '#f59e0b',
  EQUIVALENT_TO: '#8b5cf6',
};

export function ClaimGraph() {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const navigate = useNavigate();

  const { data: claims, isLoading: claimsLoading } = useQuery({
    queryKey: ['claims-graph'],
    queryFn: () => fetchClaims(),
  });

  const { data: edges, isLoading: edgesLoading } = useQuery({
    queryKey: ['edges-graph'],
    queryFn: () => fetchAllEdges(),
  });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: 500 });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  const graphData: GraphData = {
    nodes: (claims || []).map(claim => ({
      id: claim.claim_id,
      name: claim.title,
      status: claim.status,
      coherence: claim.coherence_score,
      val: 5 + claim.edge_count.supports + claim.edge_count.contradicts + claim.edge_count.refines,
    })),
    links: (edges || []).map(edge => ({
      source: edge.from_claim_id,
      target: edge.to_claim_id,
      type: edge.type,
      weight: edge.weight,
    })),
  };

  const handleNodeClick = useCallback((node: GraphNode) => {
    navigate(`/claims/${node.id}`);
  }, [navigate]);

  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const label = node.name;
    const fontSize = 12 / globalScale;
    ctx.font = `${fontSize}px Sans-Serif`;
    
    const radius = Math.sqrt(node.val) * 2;
    
    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = statusColors[node.status as Claim['status']] || '#6b7280';
    ctx.fill();
    
    // Draw border for hovered node
    if (hoveredNode?.id === node.id) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2 / globalScale;
      ctx.stroke();
    }
    
    // Draw label if zoomed in enough
    if (globalScale > 0.8) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const truncated = label.length > 25 ? label.substring(0, 22) + '...' : label;
      ctx.fillText(truncated, node.x, node.y + radius + 2);
    }
  }, [hoveredNode]);

  const linkCanvasObject = useCallback((link: any, ctx: CanvasRenderingContext2D) => {
    const start = link.source;
    const end = link.target;
    
    if (typeof start !== 'object' || typeof end !== 'object') return;
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.strokeStyle = edgeColors[link.type as Edge['type']] || '#6b7280';
    ctx.lineWidth = link.weight * 3;
    ctx.stroke();
    
    // Draw arrow
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const arrowLength = 8;
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2;
    
    ctx.beginPath();
    ctx.moveTo(midX, midY);
    ctx.lineTo(
      midX - arrowLength * Math.cos(angle - Math.PI / 6),
      midY - arrowLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      midX - arrowLength * Math.cos(angle + Math.PI / 6),
      midY - arrowLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = edgeColors[link.type as Edge['type']] || '#6b7280';
    ctx.fill();
  }, []);

  if (claimsLoading || edgesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Claim Graph</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[500px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>Claim Relationship Graph</CardTitle>
          <div className="flex flex-wrap gap-2">
            {Object.entries(edgeColors).map(([type, color]) => (
              <Badge 
                key={type} 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: color, color }}
              >
                {type.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0" ref={containerRef}>
        <div className="bg-background/50 border-t border-border">
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            width={dimensions.width}
            height={dimensions.height}
            backgroundColor="transparent"
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeClick={handleNodeClick}
            onNodeHover={setHoveredNode}
            nodePointerAreaPaint={(node: any, color, ctx) => {
              const radius = Math.sqrt(node.val) * 2;
              ctx.beginPath();
              ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={0.5}
          />
        </div>
        {hoveredNode && (
          <div className="absolute bottom-4 left-4 p-3 rounded-lg bg-card border border-border shadow-lg max-w-xs">
            <p className="font-medium text-sm">{hoveredNode.name}</p>
            <div className="flex gap-2 mt-1">
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ color: statusColors[hoveredNode.status] }}
              >
                {hoveredNode.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Coherence: {(hoveredNode.coherence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
