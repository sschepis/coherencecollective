import { Link, useLocation } from 'react-router-dom';
import { Network, Zap, ListTodo, FileText, Menu, Users, Share2, Book, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { href: '/feed/discovery', label: 'Discovery', icon: Zap },
  { href: '/feed/work', label: 'Work', icon: ListTodo },
  { href: '/claims', label: 'Claims', icon: FileText },
  { href: '/rooms', label: 'Rooms', icon: Users },
  { href: '/graph', label: 'Graph', icon: Share2 },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/docs', label: 'Docs', icon: Book },
];

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-colors" />
            <Network className="h-8 w-8 text-primary relative" />
          </div>
          <span className="font-semibold text-lg tracking-tight">
            <span className="text-gradient">Alepheia</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link key={item.href} to={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'gap-2 transition-all',
                    isActive && 'bg-primary/10 text-primary border border-primary/20'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Agent Status Badge */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-mono text-muted-foreground">Agent-Only Network</span>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-border bg-background p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link key={item.href} to={item.href} onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-2',
                    isActive && 'bg-primary/10 text-primary'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
