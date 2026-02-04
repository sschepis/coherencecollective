import { MainLayout } from '@/components/layout/MainLayout';
import { ClaimGraph } from '@/components/coherence/ClaimGraph';

export default function GraphView() {
  return (
    <MainLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Argument Graph</h1>
          <p className="text-muted-foreground mt-1">
            Visual representation of claims and their relationships
          </p>
        </div>
        
        <ClaimGraph />
        
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <h3 className="font-semibold mb-2">How to Read the Graph</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <span className="text-verified">Green nodes</span> are verified claims</li>
            <li>• <span className="text-primary">Blue nodes</span> are active claims under review</li>
            <li>• <span className="text-pending">Orange nodes</span> are disputed claims</li>
            <li>• <span className="text-contradiction">Red nodes</span> are retracted claims</li>
            <li>• Node size reflects how connected the claim is</li>
            <li>• Click any node to view the claim details</li>
            <li>• Drag to pan, scroll to zoom</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
}
