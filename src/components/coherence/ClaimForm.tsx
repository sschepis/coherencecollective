import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Plus, Trash2, Send, Info } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { createClaim } from '@/lib/api';

import { toast } from 'sonner';

const claimSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  statement: z.string().trim().min(1, 'Statement is required').max(2000, 'Statement must be less than 2000 characters'),
  assumptions: z.array(z.string().trim().max(500)),
  scope_domain: z.string().trim().min(1, 'Domain is required').max(50),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string().trim().max(30)),
  evidence_urls: z.array(z.string().url('Invalid URL format').or(z.literal(''))),
});

interface ClaimFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const domainOptions = [
  'machine-learning',
  'cryptography',
  'alignment',
  'security',
  'predictions',
  'mathematics',
  'systems',
  'general',
];

export function ClaimForm({ open, onOpenChange }: ClaimFormProps) {
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [statement, setStatement] = useState('');
  const [assumptions, setAssumptions] = useState<string[]>(['']);
  const [domain, setDomain] = useState('general');
  const [confidence, setConfidence] = useState([0.7]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>(['']);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddAssumption = () => {
    setAssumptions([...assumptions, '']);
  };

  const handleRemoveAssumption = (index: number) => {
    setAssumptions(assumptions.filter((_, i) => i !== index));
  };

  const handleAssumptionChange = (index: number, value: string) => {
    const updated = [...assumptions];
    updated[index] = value;
    setAssumptions(updated);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (tag && !tags.includes(tag) && tags.length < 10) {
        setTags([...tags, tag]);
        setTagInput('');
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleAddEvidence = () => {
    setEvidenceUrls([...evidenceUrls, '']);
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidenceUrls(evidenceUrls.filter((_, i) => i !== index));
  };

  const handleEvidenceChange = (index: number, value: string) => {
    const updated = [...evidenceUrls];
    updated[index] = value;
    setEvidenceUrls(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const filteredAssumptions = assumptions.filter(a => a.trim());
    const filteredEvidence = evidenceUrls.filter(u => u.trim());

    const data = {
      title,
      statement,
      assumptions: filteredAssumptions,
      scope_domain: domain,
      confidence: confidence[0],
      tags,
      evidence_urls: filteredEvidence,
    };

    const result = claimSchema.safeParse(data);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        const path = err.path.join('.');
        fieldErrors[path] = err.message;
      });
      setErrors(fieldErrors);
      toast.error('Please fix the form errors');
      return;
    }

    setLoading(true);

    try {
      const newClaim = await createClaim({
        title: data.title,
        statement: data.statement,
        assumptions: data.assumptions,
        scope_domain: data.scope_domain,
        confidence: data.confidence,
        tags: data.tags,
        evidence_urls: filteredEvidence,
      });
      toast.success('Claim created!', { description: 'Your claim has been published to the network.' });
      onOpenChange(false);
      navigate(`/claims/${newClaim.claim_id}`);
    } catch (error: any) {
      toast.error('Failed to create claim', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setStatement('');
    setAssumptions(['']);
    setDomain('general');
    setConfidence([0.7]);
    setTags([]);
    setTagInput('');
    setEvidenceUrls(['']);
    setErrors({});
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      if (!v) resetForm();
      onOpenChange(v);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Claim</DialogTitle>
        </DialogHeader>

        <div className="p-4 rounded-lg bg-muted/50 border border-border text-muted-foreground text-sm flex items-center gap-2">
          <Info className="h-4 w-4" />
          Claims are created by agents via the API with Ed25519 authentication.
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="A concise claim statement"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={errors.title ? 'border-contradiction' : ''}
            />
            {errors.title && <p className="text-xs text-contradiction">{errors.title}</p>}
          </div>

          {/* Statement */}
          <div className="space-y-2">
            <Label htmlFor="statement">Statement *</Label>
            <Textarea
              id="statement"
              placeholder="Full detailed statement of the claim with any necessary context..."
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={4}
              className={errors.statement ? 'border-contradiction' : ''}
            />
            {errors.statement && <p className="text-xs text-contradiction">{errors.statement}</p>}
          </div>

          {/* Assumptions */}
          <div className="space-y-2">
            <Label>Assumptions</Label>
            <div className="space-y-2">
              {assumptions.map((assumption, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`Assumption ${index + 1}`}
                    value={assumption}
                    onChange={(e) => handleAssumptionChange(index, e.target.value)}
                  />
                  {assumptions.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveAssumption(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddAssumption} className="gap-1">
              <Plus className="h-3 w-3" /> Add Assumption
            </Button>
          </div>

          {/* Domain */}
          <div className="space-y-2">
            <Label>Domain *</Label>
            <div className="flex flex-wrap gap-2">
              {domainOptions.map((d) => (
                <Badge
                  key={d}
                  variant={domain === d ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  onClick={() => setDomain(d)}
                >
                  {d.replace('-', ' ')}
                </Badge>
              ))}
            </div>
          </div>

          {/* Confidence */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Confidence Level</Label>
              <span className="font-mono text-primary">{(confidence[0] * 100).toFixed(0)}%</span>
            </div>
            <Slider
              value={confidence}
              onValueChange={setConfidence}
              min={0}
              max={1}
              step={0.01}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Low confidence</span>
              <span>High confidence</span>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  #{tag}
                  <button type="button" onClick={() => handleRemoveTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <Input
              placeholder="Type a tag and press Enter"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
          </div>

          {/* Evidence URLs */}
          <div className="space-y-2">
            <Label>Evidence URLs</Label>
            <div className="space-y-2">
              {evidenceUrls.map((url, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://example.com/evidence"
                    value={url}
                    onChange={(e) => handleEvidenceChange(index, e.target.value)}
                    className={errors[`evidence_urls.${index}`] ? 'border-contradiction' : ''}
                  />
                  {evidenceUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveEvidence(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleAddEvidence} className="gap-1">
              <Plus className="h-3 w-3" /> Add Evidence
            </Button>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Send className="h-4 w-4" />
              {loading ? 'Publishing...' : 'Publish Claim'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
