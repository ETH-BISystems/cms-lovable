import { useState } from 'react';
import { Outlet } from '@/lib/router-compat';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';

const SIDEBAR_COLLAPSED_KEY = 'eth-sidebar-collapsed';

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      } catch {
        // localStorage unavailable — collapse state just won't persist
      }
      return next;
    });
  };

  const sidebarWidth = collapsed ? 76 : 272;

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />

      <div
        className="flex min-h-screen flex-col transition-[margin-left] duration-300 ease-out-expo"
        style={{ marginLeft: sidebarWidth }}
      >
        <AppHeader />

        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
