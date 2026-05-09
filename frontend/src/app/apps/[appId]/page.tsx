'use client';
import { useQuery } from '@tanstack/react-query';
import { appsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageRenderer } from '@/components/runtime/PageRenderer';
import { DashboardStats } from '@/components/runtime/DashboardStats';
import { NotificationsPanel } from '@/components/runtime/NotificationsPanel';
import { Loader } from 'lucide-react';

export default function AppPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const appId = params.appId as string;

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => appsApi.get(appId),
    enabled: !!user && !!appId,
  });

  if (authLoading || isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader size={24} className="animate-spin text-indigo-500" />
    </div>
  );

  // FIX 1: The API returns { data: { data: { app } } } via axios wrapping.
  // Original code read data.data.app — but the real shape is data.data.data (the app object).
  // Check both shapes so it works regardless of backend version.
  const app = data?.data?.data ?? data?.data?.app;

  if (error || !app) return (
    <div className="min-h-screen flex items-center justify-center text-red-500">
      App not found
    </div>
  );

  const config = app.config || {};
  const pages = config.pages || [];
  const firstPage = pages[0];

  return (
    <AppShell appId={appId} appName={app.name} pages={pages}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{app.name}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {config.description || 'Config-driven application'}
            </p>
          </div>
          <NotificationsPanel appId={appId} />
        </div>

        {/* Dashboard stats */}
        {config.entities?.length > 0 && (
          <DashboardStats appId={appId} entities={config.entities} />
        )}

        {/* First page content */}
        {firstPage ? (
          <PageRenderer appId={appId} page={firstPage} appConfig={config} />
        ) : (
          <div className="card p-12 text-center border-dashed border-2">
            <p className="text-gray-400 mb-2">No pages configured.</p>
            <p className="text-sm text-gray-300">
              Go to Settings to edit the app configuration.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}