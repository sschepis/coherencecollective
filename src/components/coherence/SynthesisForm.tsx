import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { createSynthesis } from '@/lib/api/rooms';
import { Plus, Trash2 } from 'lucide-react';
import type { Claim } from '@/types/coherence';

const synthesisSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  summary: z.string().min(1, 'Summary is required').max(5000, 'Summary too long'),
  accepted_claim_ids: z.array(z.string()).min(1, 'Select at least one claim'),
  open_questions: z.array(z.object({
    text: z.string().min(1),
    task_id: z.string().optional(),
  })),
  confidence: z.number().min(0).max(1),
  limits: z.array(z.string()),
});

interface SynthesisFormProps {
  roomId: string;
  roomClaims: Claim[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SynthesisForm({ roomId, roomClaims, onSuccess, onCancel }: SynthesisFormProps) {
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [openQuestions, setOpenQuestions] = useState<{ text: string; task_id?: string }[]>([]);
  const [confidence, setConfidence] = useState(0.5);
  const [limits, setLimits] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: (_status: 'draft' | 'published') => {
      const data = {
        room_id: roomId,
        title,
        summary,
        accepted_claim_ids: selectedClaimIds,
        open_questions: openQuestions.filter(q => q.text.trim()),
        confidence,
        limits: limits.filter(l => l.trim()),
      };
      
      const result = synthesisSchema.safeParse(data);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach(err => {
          fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        throw new Error('Validation failed');
      }
      
      setErrors({});
      return createSynthesis(data);
    },
    onSuccess: (_, status) => {
      toast({ 
        title: status === 'published' ? 'Synthesis Published' : 'Draft Saved',
        description: status === 'published' 
          ? 'Your synthesis has been published to the room.' 
          : 'Your synthesis draft has been saved.'
      });
      queryClient.invalidateQueries({ queryKey: ['synthesis', roomId] });
      queryClient.invalidateQueries({ queryKey: ['room', roomId] });
      onSuccess?.();
    },
    onError: (error) => {
      if (error.message !== 'Validation failed') {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    },
  });

  const toggleClaim = (claimId: string) => {
    setSelectedClaimIds(prev => 
      prev.includes(claimId) 
        ? prev.filter(id => id !== claimId)
        : [...prev, claimId]
    );
  };

  const addQuestion = () => {
    setOpenQuestions(prev => [...prev, { text: '' }]);
  };

  const updateQuestion = (index: number, text: string) => {
    setOpenQuestions(prev => prev.map((q, i) => i === index ? { ...q, text } : q));
  };

  const removeQuestion = (index: number) => {
    setOpenQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const addLimit = () => {
    setLimits(prev => [...prev, '']);
  };

  const updateLimit = (index: number, text: string) => {
    setLimits(prev => prev.map((l, i) => i === index ? text : l));
  };

  const removeLimit = (index: number) => {
    setLimits(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Synthesis title..."
          className={errors.title ? 'border-destructive' : ''}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      {/* Summary */}
      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Comprehensive summary of the synthesis findings..."
          rows={4}
          className={errors.summary ? 'border-destructive' : ''}
        />
        {errors.summary && <p className="text-sm text-destructive">{errors.summary}</p>}
      </div>

      {/* Accepted Claims */}
      <div className="space-y-2">
        <Label>Accepted Claims</Label>
        {errors.accepted_claim_ids && (
          <p className="text-sm text-destructive">{errors.accepted_claim_ids}</p>
        )}
        <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-lg p-3">
          {roomClaims.length > 0 ? (
            roomClaims.map(claim => (
              <div 
                key={claim.claim_id}
                className="flex items-start gap-3 p-2 rounded hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`claim-${claim.claim_id}`}
                  checked={selectedClaimIds.includes(claim.claim_id)}
                  onCheckedChange={() => toggleClaim(claim.claim_id)}
                />
                <label 
                  htmlFor={`claim-${claim.claim_id}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  <span className="font-medium">{claim.title}</span>
                  <p className="text-muted-foreground line-clamp-1">{claim.statement}</p>
                </label>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No claims in this room yet.
            </p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedClaimIds.length} of {roomClaims.length} claims selected
        </p>
      </div>

      {/* Open Questions */}
      <div className="space-y-2">
        <Label>Open Questions</Label>
        <div className="space-y-2">
          {openQuestions.map((question, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={question.text}
                onChange={(e) => updateQuestion(index, e.target.value)}
                placeholder="What remains unanswered..."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeQuestion(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addQuestion}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Confidence */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Confidence Level</Label>
          <span className="text-sm font-mono text-primary">{(confidence * 100).toFixed(0)}%</span>
        </div>
        <Slider
          value={[confidence]}
          onValueChange={([val]) => setConfidence(val)}
          min={0}
          max={1}
          step={0.01}
        />
        <p className="text-xs text-muted-foreground">
          How confident are you in this synthesis given the available evidence?
        </p>
      </div>

      {/* Known Limits */}
      <div className="space-y-2">
        <Label>Known Limits & Caveats</Label>
        <div className="space-y-2">
          {limits.map((limit, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={limit}
                onChange={(e) => updateLimit(index, e.target.value)}
                placeholder="Scope limitation or caveat..."
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeLimit(index)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addLimit}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add Limit
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => createMutation.mutate('draft')}
          disabled={createMutation.isPending}
        >
          Save Draft
        </Button>
        <Button
          type="button"
          onClick={() => createMutation.mutate('published')}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? 'Publishing...' : 'Publish'}
        </Button>
      </div>
    </div>
  );
}
