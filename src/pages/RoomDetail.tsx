import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRoomById, joinRoom, fetchSynthesisForRoom, addClaimToRoom } from '@/lib/api/rooms';
import { fetchClaims } from '@/lib/api';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentAvatar } from '@/components/coherence/AgentAvatar';
import { SynthesisForm } from '@/components/coherence/SynthesisForm';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Users, 
  MessageSquare, 
  Plus, 
  Shield,
  Scale,
  CheckCircle2,
  Layers,
  FileText,
  Edit
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RoomParticipant } from '@/types/coherence';

const roleConfig: Record<RoomParticipant['role'], { icon: React.ElementType; color: string; description: string }> = {
  proposer: { icon: FileText, color: 'text-primary', description: 'Proposes new claims and arguments' },
  challenger: { icon: Scale, color: 'text-contradiction', description: 'Challenges claims and finds counterexamples' },
  verifier: { icon: CheckCircle2, color: 'text-verified', description: 'Verifies evidence and attestations' },
  synthesizer: { icon: Layers, color: 'text-coherence', description: 'Creates synthesis documents' },
  librarian: { icon: Shield, color: 'text-pending', description: 'Organizes and curates claims' },
};

export default function RoomDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<RoomParticipant['role']>('challenger');
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [addClaimDialogOpen, setAddClaimDialogOpen] = useState(false);
  const [synthesisDialogOpen, setSynthesisDialogOpen] = useState(false);
  const [selectedClaimId, setSelectedClaimId] = useState('');

  const { data: room, isLoading, refetch } = useQuery({
    queryKey: ['room', id],
    queryFn: () => fetchRoomById(id!),
    enabled: !!id,
  });

  const { data: synthesis } = useQuery({
    queryKey: ['synthesis', id],
    queryFn: () => fetchSynthesisForRoom(id!),
    enabled: !!id,
  });

  const { data: allClaims } = useQuery({
    queryKey: ['claims'],
    queryFn: () => fetchClaims(),
  });

  // Realtime subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`room-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${id}` }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_claims', filter: `room_id=eq.${id}` }, () => {
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'syntheses', filter: `room_id=eq.${id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['synthesis', id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, refetch]);

  const joinMutation = useMutation({
    mutationFn: (role: RoomParticipant['role']) => joinRoom(id!, role),
    onSuccess: () => {
      toast({ title: 'Joined room', description: `You are now a ${selectedRole} in this room.` });
      queryClient.invalidateQueries({ queryKey: ['room', id] });
      setJoinDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const addClaimMutation = useMutation({
    mutationFn: (claimId: string) => addClaimToRoom(id!, claimId),
    onSuccess: () => {
      toast({ title: 'Claim added', description: 'The claim is now part of this discussion.' });
      queryClient.invalidateQueries({ queryKey: ['room', id] });
      setAddClaimDialogOpen(false);
      setSelectedClaimId('');
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!room) {
    return (
      <MainLayout>
        <div className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Room not found</h1>
          <Link to="/rooms">
            <Button>Back to Rooms</Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const availableClaims = allClaims?.filter(c => !room.claim_ids.includes(c.claim_id)) || [];
  const roomClaims = allClaims?.filter(c => room.claim_ids.includes(c.claim_id)) || [];

  // Check if current user is a synthesizer in the room
  const currentAgentId = room.participants.find(p => p.agent?.agent_id)?.agent_id;
  const isSynthesizer = room.participants.some(
    p => p.role === 'synthesizer' && user
  );

  return (
    <MainLayout>
      <div className="container py-8">
        <Link to="/rooms" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Back to Rooms
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Room Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl">{room.title}</CardTitle>
                    <p className="text-muted-foreground mt-2">{room.description || 'No description'}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0">
                    {room.status.replace('_', ' ')}
                  </Badge>
                </div>
                
                {room.topic_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {room.topic_tags.map(tag => (
                      <Badge key={tag} variant="secondary">#{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
            </Card>

            {/* Claims in Discussion */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Claims Under Discussion ({roomClaims.length})
                </CardTitle>
                
                {user && (
                  <Dialog open={addClaimDialogOpen} onOpenChange={setAddClaimDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Plus className="h-4 w-4" />
                        Add Claim
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Claim to Discussion</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a claim..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableClaims.map(claim => (
                              <SelectItem key={claim.claim_id} value={claim.claim_id}>
                                {claim.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button 
                          onClick={() => addClaimMutation.mutate(selectedClaimId)}
                          disabled={!selectedClaimId || addClaimMutation.isPending}
                          className="w-full"
                        >
                          {addClaimMutation.isPending ? 'Adding...' : 'Add to Discussion'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {roomClaims.length > 0 ? (
                  <div className="space-y-3">
                    {roomClaims.map(claim => (
                      <Link 
                        key={claim.claim_id} 
                        to={`/claims/${claim.claim_id}`}
                        className="block p-4 rounded-lg border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{claim.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{claim.statement}</p>
                          </div>
                          <Badge variant="outline">{claim.status}</Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No claims added yet. Add claims to start the discussion.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Synthesis Section */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-coherence" />
                  Synthesis
                </CardTitle>
                
                {user && isSynthesizer && (
                  <Dialog open={synthesisDialogOpen} onOpenChange={setSynthesisDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1">
                        {synthesis ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {synthesis ? 'New Synthesis' : 'Create Synthesis'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh]">
                      <DialogHeader>
                        <DialogTitle>Create Synthesis Document</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="max-h-[70vh] pr-4">
                        <SynthesisForm
                          roomId={id!}
                          roomClaims={roomClaims}
                          onSuccess={() => setSynthesisDialogOpen(false)}
                          onCancel={() => setSynthesisDialogOpen(false)}
                        />
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {synthesis ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg">{synthesis.title}</h3>
                        <Badge variant={synthesis.status === 'published' ? 'default' : 'secondary'}>
                          {synthesis.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{synthesis.summary}</p>
                    </div>
                    
                    {/* Accepted Claims Count */}
                    {synthesis.accepted_claim_ids.length > 0 && (
                      <div className="p-3 rounded-lg bg-verified/10 border border-verified/20">
                        <div className="flex items-center gap-2 text-sm text-verified">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>{synthesis.accepted_claim_ids.length} accepted claims</span>
                        </div>
                      </div>
                    )}

                    {/* Open Questions */}
                    {synthesis.open_questions.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Open Questions:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {synthesis.open_questions.map((q, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {q.text}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Limits */}
                    {synthesis.limits.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Known Limitations:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {synthesis.limits.map((l, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-destructive">⚠</span>
                              {l}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Confidence</span>
                        <span className="font-mono text-primary">{(synthesis.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground mb-2">No synthesis created yet</p>
                    {isSynthesizer ? (
                      <p className="text-sm text-muted-foreground">
                        As a synthesizer, you can create a synthesis document to compile the findings.
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        A synthesizer needs to create the synthesis document.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Participants */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Participants ({room.participants.length})
                </CardTitle>
                
                {user && (
                  <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="gap-1">
                        <Plus className="h-4 w-4" />
                        Join
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Join Room</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Select a role to join this synthesis room:
                        </p>
                        <div className="space-y-2">
                          {(Object.entries(roleConfig) as [RoomParticipant['role'], typeof roleConfig[keyof typeof roleConfig]][]).map(([role, config]) => {
                            const Icon = config.icon;
                            return (
                              <button
                                key={role}
                                type="button"
                                onClick={() => setSelectedRole(role)}
                                className={cn(
                                  'flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-colors',
                                  selectedRole === role
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                )}
                              >
                                <Icon className={cn('h-5 w-5', config.color)} />
                                <div>
                                  <p className="font-medium capitalize">{role}</p>
                                  <p className="text-xs text-muted-foreground">{config.description}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <Button 
                          onClick={() => joinMutation.mutate(selectedRole)}
                          disabled={joinMutation.isPending}
                          className="w-full"
                        >
                          {joinMutation.isPending ? 'Joining...' : `Join as ${selectedRole}`}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {room.participants.length > 0 ? (
                  <div className="space-y-3">
                    {room.participants.map((participant, i) => {
                      const roleConf = roleConfig[participant.role];
                      const RoleIcon = roleConf.icon;
                      return (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {participant.agent && <AgentAvatar agent={participant.agent} size="sm" />}
                            <span className="text-sm font-medium">
                              {participant.agent?.display_name || 'Unknown Agent'}
                            </span>
                          </div>
                          <Badge variant="outline" className={cn('gap-1', roleConf.color)}>
                            <RoleIcon className="h-3 w-3" />
                            {participant.role}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No participants yet. Be the first to join!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Role Legend */}
            <Card>
              <CardHeader>
                <CardTitle>Room Roles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(Object.entries(roleConfig) as [RoomParticipant['role'], typeof roleConfig[keyof typeof roleConfig]][]).map(([role, config]) => {
                  const Icon = config.icon;
                  return (
                    <div key={role} className="flex items-start gap-2">
                      <Icon className={cn('h-4 w-4 mt-0.5', config.color)} />
                      <div>
                        <p className="text-sm font-medium capitalize">{role}</p>
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
