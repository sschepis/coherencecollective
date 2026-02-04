import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  UserPlus, 
  FileText, 
  Link2, 
  Zap,
  Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface AlephnetEvent {
  id: string;
  event_type: string;
  payload: unknown;
  source_agent_id: string | null;
  target_claim_id: string | null;
  target_task_id: string | null;
  created_at: string;
  processed_at: string | null;
  error_message: string | null;
}

const eventIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  agent_registered: UserPlus,
  task_claimed: Zap,
  task_completed: CheckCircle2,
  claim_created: FileText,
  edge_created: Link2,
  error: XCircle,
};

const eventColors: Record<string, string> = {
  agent_registered: 'text-coherence bg-coherence/10 border-coherence/30',
  task_claimed: 'text-pending bg-pending/10 border-pending/30',
  task_completed: 'text-verified bg-verified/10 border-verified/30',
  claim_created: 'text-primary bg-primary/10 border-primary/30',
  edge_created: 'text-synthesis bg-synthesis/10 border-synthesis/30',
  error: 'text-disputed bg-disputed/10 border-disputed/30',
};

export function AlephnetEventStream() {
  const [events, setEvents] = useState<AlephnetEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    loadEvents();
    
    // Subscribe to real-time events
    const channel = supabase
      .channel('alephnet-events-ui')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alephnet_events' },
        (payload) => {
          setEvents((prev) => [payload.new as AlephnetEvent, ...prev].slice(0, 50));
        }
      )
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('alephnet_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-coherence" />
            Alephnet Event Stream
          </CardTitle>
          <div className="flex items-center gap-2">
            <Radio className={cn(
              'h-4 w-4',
              connected ? 'text-coherence animate-pulse' : 'text-muted-foreground'
            )} />
            <Badge variant={connected ? 'default' : 'secondary'} className="text-xs">
              {connected ? 'LIVE' : 'CONNECTING'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="space-y-3 p-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-sm">No events yet</p>
              <p className="text-xs mt-1">Events will appear here in real-time</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function EventRow({ event }: { event: AlephnetEvent }) {
  const Icon = eventIcons[event.event_type] || Activity;
  const colorClass = eventColors[event.event_type] || 'text-muted-foreground bg-muted border-border';

  return (
    <div className="p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg border', colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              {formatEventType(event.event_type)}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </span>
          </div>
          <div className="text-xs text-muted-foreground font-mono truncate">
            {formatEventPayload(event)}
          </div>
          {event.error_message && (
            <div className="mt-2 text-xs text-disputed bg-disputed/10 rounded px-2 py-1">
              {event.error_message}
            </div>
          )}
        </div>
        {event.processed_at && (
          <CheckCircle2 className="h-4 w-4 text-verified shrink-0" />
        )}
      </div>
    </div>
  );
}

function formatEventType(type: string): string {
  return type.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatEventPayload(event: AlephnetEvent): string {
  if (!event.payload || typeof event.payload !== 'object') {
    return event.source_agent_id 
      ? `Agent: ${event.source_agent_id.slice(0, 8)}...`
      : 'System event';
  }
  const payload = event.payload as Record<string, unknown>;
  
  if (event.event_type === 'agent_registered' && payload.alephnet_pubkey) {
    return `Pubkey: ${String(payload.alephnet_pubkey).slice(0, 16)}...`;
  }
  if (event.event_type === 'task_claimed' && payload.task_type) {
    return `Task: ${payload.task_type} → ${(payload.alephnet_action as Record<string, unknown>)?.skill || 'unknown'}`;
  }
  if (event.event_type === 'claim_created' && payload.title) {
    return `"${String(payload.title).slice(0, 40)}..."`;
  }
  if (event.event_type === 'edge_created' && payload.type) {
    return `${payload.type}: ${String(payload.from_claim_id).slice(0, 8)} → ${String(payload.to_claim_id).slice(0, 8)}`;
  }
  
  return event.source_agent_id 
    ? `Agent: ${event.source_agent_id.slice(0, 8)}...`
    : 'System event';
}
