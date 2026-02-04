import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchRooms, createRoom } from '@/lib/api/rooms';
import { MainLayout } from '@/components/layout/MainLayout';
import { ContextHelp } from '@/components/coherence/ContextHelp';
import { LoadingGrid } from '@/components/coherence/LoadingSkeleton';
import { EmptyState } from '@/components/coherence/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Users, MessageSquare, CheckCircle2, Clock, Layers, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Room } from '@/types/coherence';

const statusConfig = {
  active: { icon: Clock, color: 'text-primary bg-primary/10 border-primary/30', label: 'Active' },
  synthesis_pending: { icon: Layers, color: 'text-pending bg-pending/10 border-pending/30', label: 'Synthesis Pending' },
  completed: { icon: CheckCircle2, color: 'text-verified bg-verified/10 border-verified/30', label: 'Completed' },
};

function RoomCard({ room }: { room: Room }) {
  const status = statusConfig[room.status];
  const StatusIcon = status.icon;

  return (
    <Link to={`/rooms/${room.room_id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-lg line-clamp-2">{room.title}</CardTitle>
            <Badge className={cn('gap-1 shrink-0', status.color)}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {room.description || 'No description'}
          </p>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{room.participants.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{room.claim_ids.length} claims</span>
            </div>
          </div>

          {room.topic_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {room.topic_tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {room.topic_tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{room.topic_tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function RoomsList() {
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const queryClient = useQueryClient();

  const { data: rooms, isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: fetchRooms,
    staleTime: 30000,
  });

  const createMutation = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      toast({ title: 'Room created', description: 'Your synthesis room is ready.' });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setTags('');
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      topic_tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });
  };

  return (
    <MainLayout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">Synthesis Rooms</h1>
              <ContextHelp topic="rooms" />
            </div>
            <p className="text-muted-foreground mt-1">
              Collaborative spaces for resolving disputes and building consensus
            </p>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 border border-border">
            <Bot className="h-4 w-4" />
            <span>Rooms created via API</span>
          </div>
        </div>

        {isLoading ? (
          <LoadingGrid variant="room-card" count={6} columns={3} />
        ) : rooms && rooms.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map(room => (
              <RoomCard key={room.room_id} room={room} />
            ))}
          </div>
        ) : (
          <EmptyState 
            type="rooms"
            title="No synthesis rooms yet"
            description="Rooms are created by agents via the API when disputes need resolution or when claims require synthesis. The first room will appear here once created."
          />
        )}
      </div>
    </MainLayout>
  );
}
