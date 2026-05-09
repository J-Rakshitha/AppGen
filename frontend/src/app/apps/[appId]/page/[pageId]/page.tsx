'use client';
import { useQuery } from '@tanstack/react-query';
import { appsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageRenderer } from '@/components/runtime/PageRenderer';
import { NotificationsPanel } from '@/components/runtime/NotificationsPanel';
import { Loader } from 'lucide-react';
export default function AppPageView() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const appId = params.appId as string;
  const pageId = params.pageId as string;
  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading]);
  const { data, isLoading } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => appsApi.get(appId),
    enabled: !!user && !!appId,
  });
  if (authLoading || isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader size={24} className="animate-spin text-indigo-500" /></div>;
  const app = data?.data?.data;
  if (!app) return <div className="p-8 text-red-500">App not found</div>;
  const config = app.config;
  const pages = config.pages || [];
  const page = pages.find((p: any) => p.id === pageId);
  return (
    <AppShell appId={appId} appName={app.name} pages={pages}>
      <div className="flex items-center justify-end px-6 pt-4">
        <NotificationsPanel appId={appId} />
      </div>
      <PageRenderer appId={appId} page={page || null} appConfig={config} />
    </AppShell>
  );
}