import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Network, 
  CheckCircle2, 
  Clock, 
  Users,
  ArrowRight,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  agents: number;
  consensusRequired: number;
  currentConsensus: number;
}

interface DistributedVerificationWorkflowProps {
  claimId?: string;
  claimTitle?: string;
  onComplete?: () => void;
}

export function DistributedVerificationWorkflow({
  claimId: _claimId,
  claimTitle,
  onComplete,
}: DistributedVerificationWorkflowProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<VerificationStep[]>([
    {
      id: '1',
      name: 'Initial Verification',
      description: 'Semantic analysis and evidence review',
      status: 'pending',
      agents: 0,
      consensusRequired: 3,
      currentConsensus: 0,
    },
    {
      id: '2',
      name: 'Counterexample Search',
      description: 'Adversarial testing for edge cases',
      status: 'pending',
      agents: 0,
      consensusRequired: 2,
      currentConsensus: 0,
    },
    {
      id: '3',
      name: 'Cross-Reference Check',
      description: 'Verify against existing knowledge graph',
      status: 'pending',
      agents: 0,
      consensusRequired: 2,
      currentConsensus: 0,
    },
    {
      id: '4',
      name: 'Final Consensus',
      description: 'Aggregate results and reach network consensus',
      status: 'pending',
      agents: 0,
      consensusRequired: 5,
      currentConsensus: 0,
    },
  ]);

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progress = (completedSteps / steps.length) * 100;

  const startWorkflow = () => {
    setIsRunning(true);
    // Simulate workflow progression
    simulateWorkflow();
  };

  const simulateWorkflow = () => {
    let stepIndex = 0;
    
    const progressStep = () => {
      if (stepIndex >= steps.length) {
        setIsRunning(false);
        onComplete?.();
        return;
      }

      setSteps(prev => prev.map((step, i) => {
        if (i === stepIndex) {
          return { ...step, status: 'in_progress', agents: 1 };
        }
        return step;
      }));

      // Simulate agents joining and consensus building
      let consensusProgress = 0;
      const consensusInterval = setInterval(() => {
        consensusProgress++;
        
        setSteps(prev => prev.map((step, i) => {
          if (i === stepIndex) {
            const newAgents = Math.min(step.agents + 1, step.consensusRequired + 2);
            const newConsensus = Math.min(consensusProgress, step.consensusRequired);
            
            if (newConsensus >= step.consensusRequired) {
              clearInterval(consensusInterval);
              stepIndex++;
              setTimeout(progressStep, 500);
              return { ...step, status: 'completed', agents: newAgents, currentConsensus: newConsensus };
            }
            
            return { ...step, agents: newAgents, currentConsensus: newConsensus };
          }
          return step;
        }));
      }, 800);
    };

    progressStep();
  };

  const resetWorkflow = () => {
    setIsRunning(false);
    setSteps(prev => prev.map(step => ({
      ...step,
      status: 'pending',
      agents: 0,
      currentConsensus: 0,
    })));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Network className="h-5 w-5 text-coherence" />
              Distributed Verification
            </CardTitle>
            <CardDescription>
              {claimTitle 
                ? `Verifying: "${claimTitle.slice(0, 40)}..."`
                : 'Multi-agent verification workflow'
              }
            </CardDescription>
          </div>
          <Badge variant={isRunning ? 'default' : 'secondary'} className="animate-pulse">
            {isRunning ? 'RUNNING' : 'READY'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Workflow Progress</span>
            <span className="font-mono">{completedSteps}/{steps.length} steps</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Workflow Steps */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <WorkflowStep key={step.id} step={step} index={index} />
          ))}
        </div>

        {/* Controls */}
        <div className="flex gap-2 pt-4 border-t border-border">
          {!isRunning && completedSteps === 0 && (
            <Button className="flex-1" onClick={startWorkflow}>
              <Play className="h-4 w-4 mr-2" />
              Start Verification
            </Button>
          )}
          {isRunning && (
            <Button variant="outline" className="flex-1" disabled>
              <Pause className="h-4 w-4 mr-2" />
              Running...
            </Button>
          )}
          {completedSteps > 0 && !isRunning && (
            <>
              <Button variant="outline" className="flex-1" onClick={resetWorkflow}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              {completedSteps === steps.length && (
                <Button className="flex-1">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  View Results
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowStep({ step, index }: { step: VerificationStep; index: number }) {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      borderColor: 'border-border',
    },
    in_progress: {
      icon: Network,
      color: 'text-pending',
      bgColor: 'bg-pending/10',
      borderColor: 'border-pending/30',
    },
    completed: {
      icon: CheckCircle2,
      color: 'text-verified',
      bgColor: 'bg-verified/10',
      borderColor: 'border-verified/30',
    },
    failed: {
      icon: Clock,
      color: 'text-disputed',
      bgColor: 'bg-disputed/10',
      borderColor: 'border-disputed/30',
    },
  };

  const config = statusConfig[step.status];
  const Icon = config.icon;

  return (
    <div className={cn(
      'p-4 rounded-lg border transition-all',
      config.bgColor,
      config.borderColor,
      step.status === 'in_progress' && 'ring-2 ring-pending/20'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          step.status === 'in_progress' && 'animate-pulse',
          config.bgColor
        )}>
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{step.name}</span>
            {step.status === 'in_progress' && (
              <Badge variant="outline" className="text-xs animate-pulse">
                ACTIVE
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {step.description}
          </p>
          
          {(step.status === 'in_progress' || step.status === 'completed') && (
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3 text-muted-foreground" />
                <span className="font-mono">{step.agents} agents</span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className={cn(
                  'font-mono',
                  step.currentConsensus >= step.consensusRequired 
                    ? 'text-verified' 
                    : 'text-pending'
                )}>
                  {step.currentConsensus}/{step.consensusRequired} consensus
                </span>
              </div>
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          #{index + 1}
        </span>
      </div>
    </div>
  );
}
