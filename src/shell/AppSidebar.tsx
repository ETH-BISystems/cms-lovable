import { useState } from 'react';
import { useNavigate, useLocation } from '@/lib/router-compat';
import { ChevronLeft, ChevronRight, LogOut, Settings, User } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/modules/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { navigationItems, type NavItem } from './navigation';

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

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

export function AppSidebar({ collapsed, onToggleCollapse }: AppSidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, role, signOut } = useAuth();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const isActive = (path: string) => location.pathname === path;

  const isGroupActive = (item: NavItem): boolean => {
    if (isActive(item.path)) return true;
    return item.children?.some((child) => isActive(child.path)) ?? false;
  };

  const toggleGroup = (title: string) => {
    setExpandedGroups((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleNavClick = (item: NavItem) => {
    if (item.enabled) {
      navigate(item.path);
    } else {
      toast(`${item.title} — Coming Soon`);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch {
      toast.error('Failed to sign out. Please try again.');
    }
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isGroupActive(item);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedGroups[item.title] ?? false;

    const itemButton = (
      <button
        type="button"
        onClick={() => {
          if (hasChildren && !collapsed) {
            toggleGroup(item.title);
          } else {
            handleNavClick(item);
          }
        }}
        aria-expanded={hasChildren && !collapsed ? isExpanded : undefined}
        className={`
          group relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium
          transition-all duration-150
          ${collapsed ? 'justify-center px-0' : ''}
          ${active
            ? 'bg-sidebar-accent text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-white'}
          ${!item.enabled && !hasChildren ? 'opacity-60' : ''}
        `}
      >
        {/* Active indicator rail */}
        <span
          aria-hidden
          className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-sidebar-primary transition-all duration-200 ${
            active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
          } ${collapsed ? 'left-[3px]' : ''}`}
        />
        <Icon className={`h-[18px] w-[18px] shrink-0 transition-colors ${active ? 'text-sidebar-primary' : ''}`} />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.title}</span>
            {hasChildren && (
              <ChevronRight
                className={`h-3.5 w-3.5 shrink-0 text-sidebar-muted transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </>
        )}
      </button>
    );

    return (
      <li key={item.title}>
        {collapsed ? (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>{itemButton}</TooltipTrigger>
            <TooltipContent side="right" sideOffset={10}>
              {item.title}
            </TooltipContent>
          </Tooltip>
        ) : (
          itemButton
        )}

        {/* Nested items — animated open/close via grid rows */}
        {hasChildren && !collapsed && (
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
              isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
            }`}
          >
            <ul className="mt-1 ml-[18px] space-y-0.5 overflow-hidden border-l border-sidebar-border pl-3">
              {item.children!.filter((child) => child.enabled).map((child) => {
                const ChildIcon = child.icon;
                const childActive = isActive(child.path);
                return (
                  <li key={child.title}>
                    <button
                      type="button"
                      onClick={() => handleNavClick(child)}
                      className={`
                        flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors duration-150
                        ${childActive
                          ? 'bg-sidebar-accent text-white font-medium'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-white'}
                      `}
                    >
                      <ChildIcon className={`h-3.5 w-3.5 shrink-0 ${childActive ? 'text-sidebar-primary' : ''}`} />
                      <span className="truncate text-left">{child.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </li>
    );
  };

  const initials = getInitials(userProfile?.displayName);
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : null;

  return (
    <TooltipProvider>
      <aside
        className={`
          fixed left-0 top-0 z-40 flex h-screen flex-col
          bg-gradient-to-b from-sidebar to-[hsl(202,55%,7%)] text-white
          shadow-[6px_0_32px_-16px_rgba(3,30,44,0.6)]
          transition-[width] duration-300 ease-out-expo
          ${collapsed ? 'w-[76px]' : 'w-[272px]'}
        `}
      >
        {/* Brand header */}
        <div className={`flex items-center gap-3 px-4 pb-3 pt-5 ${collapsed ? 'justify-center px-0' : ''}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sidebar-primary to-cyan-600 text-[13px] font-bold text-white shadow-[0_2px_8px_-2px_rgb(8_145_178/0.6)]">
            EP
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-[14px] font-semibold leading-tight tracking-tight">
                Elite Points and Miles
              </h1>
              <p className="mt-0.5 truncate text-[10.5px] text-sidebar-muted">
                Blog and Newsletter Content Engine
              </p>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto overflow-x-hidden px-3 py-3">
          <ul className="space-y-0.5">
            {navigationItems.filter((item) => item.enabled).map(renderNavItem)}
          </ul>
        </nav>

        {/* Bottom: user profile + collapse control */}
        <div className="border-t border-sidebar-border/80 px-3 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="User menu"
                className={`
                  group flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left
                  transition-colors duration-150 hover:bg-sidebar-accent/60
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sidebar-primary to-cyan-700 text-[11px] font-semibold text-white ring-1 ring-white/15">
                  {initials}
                </span>
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium text-white/90">
                        {userProfile?.displayName || 'Signed in'}
                      </span>
                      {roleLabel && (
                        <span className="block truncate text-[10.5px] text-sidebar-muted">{roleLabel}</span>
                      )}
                    </span>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-sidebar-muted transition-transform group-data-[state=open]:rotate-90" />
                  </>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="end" sideOffset={12} className="w-52">
              <DropdownMenuLabel className="text-xs">
                <span className="block truncate font-medium">{userProfile?.displayName || 'Signed in'}</span>
                {userProfile?.email && (
                  <span className="block truncate font-normal text-muted-foreground">{userProfile.email}</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast('Profile — Coming Soon')} className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
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

          <button
            type="button"
            onClick={onToggleCollapse}
            className={`
              mt-2 flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-[11.5px] text-sidebar-muted
              transition-all duration-150 hover:bg-sidebar-accent/60 hover:text-white active:scale-[0.98]
              ${collapsed ? 'justify-center px-0' : ''}
            `}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft
              className={`h-4 w-4 shrink-0 transition-transform duration-300 ease-out-expo ${collapsed ? 'rotate-180' : ''}`}
            />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
