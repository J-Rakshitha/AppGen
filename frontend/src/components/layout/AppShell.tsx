'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Settings, LogOut, ChevronLeft, Zap, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

interface AppShellProps {
  children: React.ReactNode;
  appId?: string;
  appName?: string;
  pages?: { id: string; label?: string; title?: string; icon?: string }[];
}

export function AppShell({ children, appId, appName, pages }: AppShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // FIX 1: Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  // FIX 2: Close sidebar on route change (navigating on mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const navItems: NavItem[] = appId && pages
    ? pages.map(p => ({
        href: `/apps/${appId}/page/${p.id}`,
        label: p.label || p.title || p.id,
        // FIX 3: Removed broken unicode ðŸ"‹ → use a safe default emoji fallback
        icon: <span className="text-base leading-none">{p.icon || '📋'}</span>,
      }))
    : [
        { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      ];

  // FIX 4: Exact + prefix matching so nested routes also highlight the parent nav item
  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  }

  const sidebar = (
    <aside
      className={cn(
        'flex flex-col w-64 bg-gray-900 text-white flex-shrink-0',
        // FIX 5: Use full viewport height reliably — h-screen instead of h-full
        'fixed inset-y-0 left-0 z-50 h-screen lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}
    >
      {/* Brand / user header */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{appName || 'AppGen'}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
        </div>
        <button
          className="lg:hidden text-gray-400 hover:text-white transition-colors"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>

      {/* Back to all apps */}
      {appId && (
        <div className="px-2 py-2 border-b border-gray-800 flex-shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            {/* FIX 6: ChevronLeft is clearer than a rotated ChevronRight */}
            <ChevronLeft size={12} />
            All Apps
          </Link>
        </div>
      )}

      {/* Nav links */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              // FIX 7: Use isActive() for correct highlighting
              isActive(item.href)
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            {item.icon}
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="px-2 py-3 border-t border-gray-800 space-y-1 flex-shrink-0">
        {appId && (
          <Link
            href={`/apps/${appId}/settings`}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              isActive(`/apps/${appId}/settings`)
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            )}
          >
            <Settings size={18} />
            Settings
          </Link>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {sidebar}

      {/* FIX 8: Overlay z-index is below sidebar (z-40 < z-50) — was correct but
          pointer-events must be explicit so clicks always register */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 lg:hidden flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm truncate">{appName || 'AppGen'}</span>
        </header>

        {/* FIX 9: main needs overflow-auto so page content scrolls, not the whole shell */}
        <main className="flex-1 overflow-auto min-h-0">
          {children}
        </main>
      </div>
    </div>
  );
}