import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Key, 
  Server, 
  Shield, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AgentAlephnetStatusProps {
  agentId: string;
  alephnetPubkey: string | null;
  alephnetStakeTier: string | null;
  alephnetNodeUrl: string | null;
  onUpdate?: () => void;
}

export function AgentAlephnetStatus({
  agentId,
  alephnetPubkey,
  alephnetStakeTier,
  alephnetNodeUrl,
  onUpdate,
}: AgentAlephnetStatusProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [pubkey, setPubkey] = useState(alephnetPubkey || '');
  const [nodeUrl, setNodeUrl] = useState(alephnetNodeUrl || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const isRegistered = !!alephnetPubkey;

  const handleSave = async () => {
    if (!pubkey.trim()) {
      toast({
        title: 'Invalid pubkey',
        description: 'Please enter a valid Ed25519 public key',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('agents')
        .update({
          alephnet_pubkey: pubkey,
          alephnet_node_url: nodeUrl || null,
        })
        .eq('id', agentId);

      if (error) throw error;

      // Log the registration event
      await supabase.from('alephnet_events').insert({
        event_type: 'agent_registered',
        source_agent_id: agentId,
        payload: { alephnet_pubkey: pubkey },
      });

      toast({
        title: 'Alephnet identity registered',
        description: 'Your agent is now connected to the Alephnet mesh',
      });
      
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error updating alephnet identity:', error);
      toast({
        title: 'Registration failed',
        description: 'Could not register Alephnet identity',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Alephnet Identity
            </CardTitle>
            <CardDescription>
              Connect to the distributed agent mesh
            </CardDescription>
          </div>
          <Badge 
            variant={isRegistered ? 'default' : 'secondary'}
            className={cn(
              isRegistered && 'bg-coherence text-coherence-foreground'
            )}
          >
            {isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isRegistered && !isEditing ? (
          <>
            {/* Registered View */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <Key className="h-5 w-5 text-coherence shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground mb-0.5">Public Key</p>
                  <p className="font-mono text-sm truncate">{alephnetPubkey}</p>
                </div>
                <CheckCircle2 className="h-5 w-5 text-verified shrink-0" />
              </div>

              {alephnetNodeUrl && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                  <Server className="h-5 w-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground mb-0.5">Node URL</p>
                    <p className="font-mono text-sm truncate">{alephnetNodeUrl}</p>
                  </div>
                  <a 
                    href={alephnetNodeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <Shield className="h-5 w-5 text-synthesis shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground mb-0.5">Stake Tier</p>
                  <p className="font-medium text-sm capitalize">
                    {alephnetStakeTier || 'None'}
                  </p>
                </div>
                <StakeTierBadge tier={alephnetStakeTier} />
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setIsEditing(true)}
            >
              Update Identity
            </Button>
          </>
        ) : (
          <>
            {/* Registration/Edit Form */}
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-pending/10 border border-pending/30">
                <AlertCircle className="h-5 w-5 text-pending shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-pending">Connect to Alephnet</p>
                  <p className="text-muted-foreground mt-1">
                    Enter your Ed25519 public key to register this agent with the 
                    Alephnet mesh network.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pubkey">Ed25519 Public Key *</Label>
                <Input
                  id="pubkey"
                  placeholder="Enter your public key (64 hex characters)"
                  value={pubkey}
                  onChange={(e) => setPubkey(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nodeUrl">Node URL (optional)</Label>
                <Input
                  id="nodeUrl"
                  placeholder="https://your-node.example.com"
                  value={nodeUrl}
                  onChange={(e) => setNodeUrl(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              {isRegistered && (
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => {
                    setIsEditing(false);
                    setPubkey(alephnetPubkey || '');
                    setNodeUrl(alephnetNodeUrl || '');
                  }}
                >
                  Cancel
                </Button>
              )}
              <Button 
                className="flex-1"
                onClick={handleSave}
                disabled={saving || !pubkey.trim()}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Registering...
                  </>
                ) : (
                  'Register Identity'
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StakeTierBadge({ tier }: { tier: string | null }) {
  const tierConfig: Record<string, { color: string; label: string }> = {
    none: { color: 'bg-muted text-muted-foreground', label: 'No Stake' },
    basic: { color: 'bg-primary/20 text-primary', label: 'Basic' },
    verified: { color: 'bg-verified/20 text-verified', label: 'Verified' },
    trusted: { color: 'bg-coherence/20 text-coherence', label: 'Trusted' },
  };

  const config = tierConfig[tier || 'none'] || tierConfig.none;

  return (
    <Badge variant="outline" className={cn('text-xs', config.color)}>
      {config.label}
    </Badge>
  );
}
