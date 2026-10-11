import { useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Search, Bell, User, LogOut, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function getInitials(displayName?: string | null): string {
  if (!displayName || displayName.trim().length === 0) return 'U';
  return displayName
    .trim()
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AppHeader() {
  const { userProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const initials = getInitials(userProfile?.displayName);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // ⌘K / Ctrl+K focuses the search input (matches the kbd hint)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  /** Submit the search: deep-link into the RSS Feed Monitor keyword search. */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/rss?q=${encodeURIComponent(q)}`);
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  return (
    <header
      className={`sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-6 backdrop-blur-md transition-shadow duration-200 ${
        scrolled ? 'border-border shadow-[0_1px_8px_-2px_rgb(15_23_42/0.08)]' : 'border-transparent'
      }`}
    >
      {/* Global search — Enter opens the RSS Feed Monitor filtered by the query */}
      <form className="group relative max-w-xl flex-1" onSubmit={handleSearchSubmit} role="search">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70 transition-colors group-focus-within:text-accent" />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search articles, keywords, newsletters, assets..."
          aria-label="Search articles"
          className="h-9 w-full rounded-lg border border-border/70 bg-card/70 pl-9 pr-14 text-[13px] text-foreground shadow-[0_1px_2px_rgb(15_23_42/0.03)] outline-none transition-[border-color,box-shadow,background-color] duration-150 hover:bg-card focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/25 placeholder:text-muted-foreground"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border/80 bg-muted/80 px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground shadow-[0_1px_0_rgb(15_23_42/0.04)]">
          ⌘K
        </kbd>
      </form>

      {/* Right side: notification bell + user avatar */}
      <div className="flex items-center gap-2">
        {/* Notification bell — disabled, Coming Soon */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                disabled
                className="relative flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60"
                aria-label="Notifications — Coming Soon"
              >
                <Bell className="h-[18px] w-[18px]" />
                <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[8px] font-bold text-accent-foreground ring-2 ring-background">
                  0
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent>Notifications — Coming Soon</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-cyan-700 text-xs font-semibold text-white ring-1 ring-black/5 transition-all duration-150 hover:shadow-[0_2px_8px_-2px_rgb(8_145_178/0.5)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="User menu"
            >
              {initials}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => toast('Profile — Coming Soon')} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast('Settings — Coming Soon')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
