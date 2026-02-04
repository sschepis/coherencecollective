import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchClaims } from '@/lib/api';
import { createEdge } from '@/lib/api/edges';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { GitBranch, Link2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import type { Edge } from '@/types/coherence';

interface EdgeFormProps {
  fromClaimId: string;
  fromClaimTitle: string;
  onSuccess?: () => void;
}

const edgeTypes: { value: Edge['type']; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'SUPPORTS', label: 'Supports', icon: <CheckCircle2 className="h-4 w-4 text-verified" />, description: 'This claim provides evidence for the target' },
  { value: 'CONTRADICTS', label: 'Contradicts', icon: <AlertCircle className="h-4 w-4 text-contradiction" />, description: 'This claim conflicts with the target' },
  { value: 'REFINES', label: 'Refines', icon: <GitBranch className="h-4 w-4 text-primary" />, description: 'This claim adds nuance or specification' },
  { value: 'DEPENDS_ON', label: 'Depends On', icon: <Link2 className="h-4 w-4 text-pending" />, description: 'This claim requires the target to be true' },
  { value: 'EQUIVALENT_TO', label: 'Equivalent To', icon: <Layers className="h-4 w-4 text-muted-foreground" />, description: 'These claims express the same idea' },
];

export function EdgeForm({ fromClaimId, fromClaimTitle, onSuccess }: EdgeFormProps) {
  const [open, setOpen] = useState(false);
  const [toClaimId, setToClaimId] = useState('');
  const [edgeType, setEdgeType] = useState<Edge['type'] | ''>('');
  const [justification, setJustification] = useState('');
  const [weight, setWeight] = useState([0.5]);
  const queryClient = useQueryClient();

  const { data: claims } = useQuery({
    queryKey: ['claims-for-edge'],
    queryFn: () => fetchClaims(),
  });

  const mutation = useMutation({
    mutationFn: createEdge,
    onSuccess: () => {
      toast({ title: 'Edge created', description: 'The relationship has been added to the graph.' });
      queryClient.invalidateQueries({ queryKey: ['edges'] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      setOpen(false);
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setToClaimId('');
    setEdgeType('');
    setJustification('');
    setWeight([0.5]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toClaimId || !edgeType || !justification) {
      toast({ title: 'Missing fields', description: 'Please fill all required fields.', variant: 'destructive' });
      return;
    }

    mutation.mutate({
      from_claim_id: fromClaimId,
      to_claim_id: toClaimId,
      type: edgeType,
      justification,
      weight: weight[0],
    });
  };

  const otherClaims = claims?.filter(c => c.claim_id !== fromClaimId) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full gap-2">
          <GitBranch className="h-4 w-4" />
          Add Relationship
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Edge</DialogTitle>
          <DialogDescription>
            Link "<span className="font-medium">{fromClaimTitle}</span>" to another claim
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Edge Type Selection */}
          <div className="space-y-2">
            <Label>Relationship Type *</Label>
            <div className="grid grid-cols-1 gap-2">
              {edgeTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEdgeType(type.value)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${
                    edgeType === type.value 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {type.icon}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Target Claim */}
          <div className="space-y-2">
            <Label>Target Claim *</Label>
            <Select value={toClaimId} onValueChange={setToClaimId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target claim..." />
              </SelectTrigger>
              <SelectContent>
                {otherClaims.map((claim) => (
                  <SelectItem key={claim.claim_id} value={claim.claim_id}>
                    <span className="truncate">{claim.title}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Justification */}
          <div className="space-y-2">
            <Label>Justification *</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explain why these claims are related..."
              className="min-h-[80px]"
            />
          </div>

          {/* Weight */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Strength</Label>
              <span className="text-sm text-muted-foreground">{(weight[0] * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={weight}
              onValueChange={setWeight}
              min={0.1}
              max={1}
              step={0.1}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1">
              {mutation.isPending ? 'Creating...' : 'Create Edge'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
