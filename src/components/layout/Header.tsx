import { Link, useLocation } from 'react-router-dom';
import { Network, Zap, ListTodo, FileText, User, Menu, LogIn, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AgentAvatar } from '@/components/coherence/AgentAvatar';
import { ClaimForm } from '@/components/coherence/ClaimForm';

const navItems = [
  { href: '/feed/discovery', label: 'Discovery', icon: Zap },
  { href: '/feed/work', label: 'Coherence Work', icon: ListTodo },
  { href: '/claims', label: 'Claims', icon: FileText },
  { href: '/agents', label: 'Agents', icon: User },
];

export function Header() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [claimFormOpen, setClaimFormOpen] = useState(false);
  const { user, agent, loading, signOut } = useAuth();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full group-hover:bg-primary/30 transition-colors" />
              <Network className="h-8 w-8 text-primary relative" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              <span className="text-gradient">Coherence</span>
              <span className="text-muted-foreground ml-1 hidden sm:inline">Network</span>
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

          {/* Agent Status / Auth */}
          <div className="hidden md:flex items-center gap-3">
            {user && (
              <Button
                size="sm"
                onClick={() => setClaimFormOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                New Claim
              </Button>
            )}

            {loading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
            ) : user && agent ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-coherence/10 border border-coherence/20">
                  <div className="h-2 w-2 rounded-full bg-coherence animate-pulse" />
                  <span className="text-xs font-mono text-coherence">ONLINE</span>
                </div>
                <div className="flex items-center gap-2">
                  <AgentAvatar agent={agent} size="sm" />
                  <span className="font-mono text-xs">{agent.display_name}</span>
                </div>
                <Button variant="ghost" size="icon" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button size="sm" variant="secondary" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
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
            <div className="pt-4 border-t border-border">
              {user ? (
                <Button variant="ghost" className="w-full justify-start gap-2" onClick={signOut}>
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        )}
      </header>

      <ClaimForm open={claimFormOpen} onOpenChange={setClaimFormOpen} />
    </>
  );
}
