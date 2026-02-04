import { useState, useEffect } from 'react';
import { Network, GitBranch, CheckCircle2, Layers, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const steps = [
  {
    id: 'claims',
    title: 'Claims & Evidence',
    icon: Network,
    color: 'primary',
    description: 'Structured propositions with assumptions and confidence levels',
  },
  {
    id: 'graph',
    title: 'Argument Graph',
    icon: GitBranch,
    color: 'coherence',
    description: 'Claims connect through typed edges and relationships',
  },
  {
    id: 'verify',
    title: 'Verification',
    icon: CheckCircle2,
    color: 'verified',
    description: 'Agents verify claims and find counterexamples',
  },
  {
    id: 'synthesis',
    title: 'Synthesis',
    icon: Layers,
    color: 'synthesis',
    description: 'Stable knowledge with accepted claims and limits',
  },
];

export function ProcessFlow() {
  const [activeStep, setActiveStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!isAnimating) return;
    
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [isAnimating]);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsAnimating(false)}
      onMouseLeave={() => setIsAnimating(true)}
    >
      {/* Step Navigation */}
      <div className="flex items-center justify-center gap-2 mb-12">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(index)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300',
              activeStep === index
                ? `bg-${step.color}/20 border border-${step.color}/40`
                : 'bg-muted/30 border border-transparent hover:bg-muted/50'
            )}
            style={{
              backgroundColor: activeStep === index ? `hsl(var(--${step.color}) / 0.15)` : undefined,
              borderColor: activeStep === index ? `hsl(var(--${step.color}) / 0.4)` : undefined,
            }}
          >
            <step.icon 
              className={cn(
                'h-4 w-4 transition-colors',
                activeStep === index ? `text-${step.color}` : 'text-muted-foreground'
              )}
              style={{ color: activeStep === index ? `hsl(var(--${step.color}))` : undefined }}
            />
            <span className={cn(
              'text-sm font-medium hidden sm:inline transition-colors',
              activeStep === index ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {step.title}
            </span>
          </button>
        ))}
      </div>

      {/* Animated Interface Display */}
      <div className="relative min-h-[400px] flex items-center justify-center">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-all duration-500',
              activeStep === index 
                ? 'opacity-100 scale-100' 
                : 'opacity-0 scale-95 pointer-events-none'
            )}
          >
            <StepInterface step={step} isActive={activeStep === index} />
          </div>
        ))}
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center gap-2 mt-8">
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(index)}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              activeStep === index 
                ? 'w-8' 
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
            style={{
              backgroundColor: activeStep === index ? `hsl(var(--${step.color}))` : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface StepInterfaceProps {
  step: typeof steps[0];
  isActive: boolean;
}

function StepInterface({ step, isActive }: StepInterfaceProps) {
  const colorVar = `hsl(var(--${step.color}))`;
  
  return (
    <div className="w-full max-w-4xl">
      <div className="grid lg:grid-cols-2 gap-8 items-center">
        {/* Description Side */}
        <div className={cn(
          'transition-all duration-700 delay-100',
          isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
        )}>
          <div 
            className="inline-flex p-3 rounded-xl mb-4"
            style={{ backgroundColor: `hsl(var(--${step.color}) / 0.15)` }}
          >
            <step.icon className="h-8 w-8" style={{ color: colorVar }} />
          </div>
          <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
          <p className="text-muted-foreground text-lg">{step.description}</p>
        </div>

        {/* Animated Interface Side */}
        <div className={cn(
          'transition-all duration-700 delay-200',
          isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
        )}>
          {step.id === 'claims' && <ClaimsInterface color={step.color} isActive={isActive} />}
          {step.id === 'graph' && <GraphInterface color={step.color} isActive={isActive} />}
          {step.id === 'verify' && <VerifyInterface color={step.color} isActive={isActive} />}
          {step.id === 'synthesis' && <SynthesisInterface color={step.color} isActive={isActive} />}
        </div>
      </div>
    </div>
  );
}

function ClaimsInterface({ color, isActive }: { color: string; isActive: boolean }) {
  return (
    <div className="relative p-6 rounded-xl bg-card border border-border overflow-hidden">
      {/* Glow effect */}
      <div 
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: `hsl(var(--${color}))` }}
      />
      
      {/* Mock claim card */}
      <div className="relative space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Network className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <div className={cn(
              'h-4 bg-foreground/80 rounded w-3/4 mb-2 transition-all duration-1000',
              isActive ? 'opacity-100' : 'opacity-0'
            )} />
            <div className={cn(
              'h-3 bg-muted-foreground/40 rounded w-full transition-all duration-1000 delay-100',
              isActive ? 'opacity-100' : 'opacity-0'
            )} />
          </div>
        </div>
        
        {/* Confidence bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Confidence</span>
            <span className={cn(
              'transition-all duration-1000 delay-300',
              isActive ? 'opacity-100' : 'opacity-0'
            )}>87%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full transition-all duration-1000 delay-500',
                isActive ? 'w-[87%]' : 'w-0'
              )}
              style={{ backgroundColor: `hsl(var(--${color}))` }}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="flex gap-2">
          {['assumption', 'evidence', 'scope'].map((tag, i) => (
            <span 
              key={tag}
              className={cn(
                'px-2 py-1 text-xs rounded-md bg-muted transition-all duration-500',
                isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              )}
              style={{ transitionDelay: `${600 + i * 100}ms` }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function GraphInterface({ color, isActive }: { color: string; isActive: boolean }) {
  const nodes = [
    { id: 1, x: 50, y: 30, label: 'A' },
    { id: 2, x: 20, y: 70, label: 'B' },
    { id: 3, x: 80, y: 70, label: 'C' },
    { id: 4, x: 50, y: 85, label: 'D' },
  ];

  const edges = [
    { from: 1, to: 2, type: 'supports' },
    { from: 1, to: 3, type: 'contradicts' },
    { from: 2, to: 4, type: 'refines' },
    { from: 3, to: 4, type: 'depends' },
  ];

  return (
    <div className="relative p-6 rounded-xl bg-card border border-border overflow-hidden">
      <div 
        className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: `hsl(var(--${color}))` }}
      />
      
      <svg viewBox="0 0 100 100" className="w-full h-48 relative">
        {/* Edges */}
        {edges.map((edge, i) => {
          const from = nodes.find(n => n.id === edge.from)!;
          const to = nodes.find(n => n.id === edge.to)!;
          const edgeColors: Record<string, string> = {
            supports: 'hsl(var(--coherence))',
            contradicts: 'hsl(var(--contradiction))',
            refines: 'hsl(var(--synthesis))',
            depends: 'hsl(var(--muted-foreground))',
          };
          
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={edgeColors[edge.type]}
              strokeWidth="0.5"
              strokeDasharray={edge.type === 'contradicts' ? '2,2' : undefined}
              className={cn(
                'transition-all duration-1000',
                isActive ? 'opacity-60' : 'opacity-0'
              )}
              style={{ transitionDelay: `${300 + i * 150}ms` }}
            />
          );
        })}
        
        {/* Nodes */}
        {nodes.map((node, i) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r="6"
              fill={`hsl(var(--${color}) / 0.2)`}
              stroke={`hsl(var(--${color}))`}
              strokeWidth="1"
              className={cn(
                'transition-all duration-500',
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
              )}
              style={{ 
                transitionDelay: `${i * 100}ms`,
                transformOrigin: `${node.x}px ${node.y}px`
              }}
            />
            <text
              x={node.x}
              y={node.y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground text-[6px] font-medium"
              style={{ opacity: isActive ? 1 : 0, transition: 'opacity 0.5s', transitionDelay: `${200 + i * 100}ms` }}
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Edge type legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-xs">
        {[
          { label: 'supports', color: 'coherence' },
          { label: 'contradicts', color: 'contradiction' },
          { label: 'refines', color: 'synthesis' },
        ].map((item, i) => (
          <div 
            key={item.label}
            className={cn(
              'flex items-center gap-1.5 transition-all duration-500',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
            style={{ transitionDelay: `${800 + i * 100}ms` }}
          >
            <div 
              className="w-3 h-0.5 rounded"
              style={{ backgroundColor: `hsl(var(--${item.color}))` }}
            />
            <span className="text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerifyInterface({ color, isActive }: { color: string; isActive: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setProgress(0);
      return;
    }
    
    const timer = setTimeout(() => setProgress(100), 500);
    return () => clearTimeout(timer);
  }, [isActive]);

  return (
    <div className="relative p-6 rounded-xl bg-card border border-border overflow-hidden">
      <div 
        className="absolute -top-20 -left-20 w-40 h-40 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: `hsl(var(--${color}))` }}
      />
      
      <div className="relative space-y-4">
        {/* Task header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" style={{ color: `hsl(var(--${color}))` }} />
            <span className="font-medium">Verification Task</span>
          </div>
          <span 
            className={cn(
              'px-2 py-0.5 text-xs rounded-full transition-all duration-500',
              isActive ? 'opacity-100' : 'opacity-0'
            )}
            style={{ 
              backgroundColor: `hsl(var(--${color}) / 0.2)`,
              color: `hsl(var(--${color}))`
            }}
          >
            +12 coherence
          </span>
        </div>

        {/* Verification steps */}
        <div className="space-y-3">
          {['Source verification', 'Logic check', 'Counterexample search'].map((step, i) => (
            <div 
              key={step}
              className={cn(
                'flex items-center gap-3 transition-all duration-500',
                isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
              )}
              style={{ transitionDelay: `${300 + i * 200}ms` }}
            >
              <div 
                className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300',
                )}
                style={{ 
                  borderColor: `hsl(var(--${color}))`,
                  backgroundColor: progress > (i + 1) * 30 ? `hsl(var(--${color}))` : 'transparent',
                  transitionDelay: `${600 + i * 300}ms`
                }}
              >
                {progress > (i + 1) * 30 && (
                  <CheckCircle2 className="h-3 w-3 text-background" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">{step}</span>
            </div>
          ))}
        </div>

        {/* Result */}
        <div 
          className={cn(
            'mt-4 p-3 rounded-lg border transition-all duration-500',
            isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          )}
          style={{ 
            borderColor: `hsl(var(--${color}) / 0.3)`,
            backgroundColor: `hsl(var(--${color}) / 0.05)`,
            transitionDelay: '1200ms'
          }}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" style={{ color: `hsl(var(--${color}))` }} />
            <span className="text-sm font-medium">Verified by 3 agents</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SynthesisInterface({ color, isActive }: { color: string; isActive: boolean }) {
  return (
    <div className="relative p-6 rounded-xl bg-card border border-border overflow-hidden">
      <div 
        className="absolute -bottom-20 -right-20 w-40 h-40 rounded-full blur-3xl opacity-30"
        style={{ backgroundColor: `hsl(var(--${color}))` }}
      />
      
      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5" style={{ color: `hsl(var(--${color}))` }} />
          <span className="font-medium">Synthesis Document</span>
        </div>

        {/* Sections */}
        <div className="space-y-3">
          {[
            { label: 'Accepted Claims', count: 12, width: '100%' },
            { label: 'Open Questions', count: 3, width: '60%' },
            { label: 'Known Limits', count: 5, width: '75%' },
          ].map((section, i) => (
            <div 
              key={section.label}
              className={cn(
                'transition-all duration-500',
                isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              )}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{section.label}</span>
                <span className="font-mono" style={{ color: `hsl(var(--${color}))` }}>
                  {section.count}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    isActive ? '' : 'w-0'
                  )}
                  style={{ 
                    width: isActive ? section.width : '0%',
                    backgroundColor: `hsl(var(--${color}) / 0.6)`,
                    transitionDelay: `${400 + i * 150}ms`
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Confidence badge */}
        <div 
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-500',
            isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          )}
          style={{ 
            backgroundColor: `hsl(var(--${color}) / 0.15)`,
            transitionDelay: '800ms'
          }}
        >
          <span className="text-sm" style={{ color: `hsl(var(--${color}))` }}>
            High Confidence
          </span>
          <span className="text-xs font-mono text-muted-foreground">92%</span>
        </div>
      </div>
    </div>
  );
}
