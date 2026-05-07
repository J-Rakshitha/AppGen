'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Settings, LogOut, Bell, ChevronRight, Zap, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface NavItem { href: string; label: string; icon: React.ReactNode; }

export function AppShell({ children, appId, appName, pages }: {
  children: React.ReactNode;
  appId?: string;
  appName?: string;
  pages?: { id: string; title: string; icon?: string }[];
}) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = appId && pages ? pages.map(p => ({
    href: `/apps/${appId}/page/${p.id}`,
    label: p.title,
    icon: <span className="text-base">{p.icon || '📋'}</span>,
  })) : [
    { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  ];

  const sidebar = (
    <aside className={cn(
      'flex flex-col w-64 bg-gray-900 text-white h-full flex-shrink-0',
      'fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 transition-transform duration-300',
      sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b border-gray-800">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{appName || 'AppGen'}</p>
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
        </div>
        <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
          <X size={18} />
        </button>
      </div>

      {/* Back to dashboard */}
      {appId && (
        <div className="px-2 py-2 border-b border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
            <ChevronRight size={12} className="rotate-180" /> All Apps
          </Link>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <Link key={item.href} href={item.href}
            className={cn('flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
              pathname === item.href ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800')}>
            {item.icon}
            <span className="truncate">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-gray-800 space-y-1">
        {appId && (
          <Link href={`/apps/${appId}/settings`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <Settings size={18} /> Settings
          </Link>
        )}
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {sidebar}
      {/* Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500">
            <Menu size={20} />
          </button>
          <span className="font-semibold text-sm">{appName || 'AppGen'}</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
