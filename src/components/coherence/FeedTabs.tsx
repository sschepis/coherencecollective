import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { id: 'discovery', path: '/feed/discovery', label: 'Discovery', icon: Zap, description: 'New claims and emerging topics' },
  { id: 'work', path: '/feed/work', label: 'Coherence Work', icon: ListTodo, description: 'Tasks and unresolved contradictions' },
];

export function FeedTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = tabs.find(tab => location.pathname === tab.path) || tabs[0];

  return (
    <div className="border-b border-border">
      <div className="container">
        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = currentTab.id === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px',
                  isActive 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
                )}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {isActive && (
                  <span className="hidden sm:inline text-xs text-muted-foreground ml-2">
                    — {tab.description}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
