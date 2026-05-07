'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter, useParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { ConfigEditor } from '@/components/runtime/ConfigEditor';
import { getErrorMessage, SAMPLE_CONFIGS } from '@/lib/utils';
import { Loader, Download, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function AppSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const appId = params.appId as string;
  const qc = useQueryClient();

  useEffect(() => { if (!authLoading && !user) router.push('/login'); }, [user, authLoading]);

  const { data, isLoading } = useQuery({
    queryKey: ['app', appId],
    queryFn: () => appsApi.get(appId),
    enabled: !!user && !!appId,
  });

  const [config, setConfig] = useState<any>(null);
  const [tab, setTab] = useState<'editor' | 'info'>('editor');
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    if (data?.data?.app?.config) setConfig(data.data.app.config);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: () => appsApi.update(appId, { config }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['app', appId] });
      setWarnings(r.data.warnings || []);
      toast.success('Config saved!');
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: () => appsApi.delete(appId),
    onSuccess: () => { toast.success('App deleted'); router.push('/dashboard'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (authLoading || isLoading || !config) {
    return <div className="min-h-screen flex items-center justify-center"><Loader size={24} className="animate-spin text-indigo-500" /></div>;
  }

  const app = data?.data?.app;

  return (
    <AppShell appId={appId} appName={app?.name} pages={config.pages || []}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Link href={`/apps/${appId}`} className="btn-ghost text-sm py-1.5 px-3">← Back</Link>
            <h2 className="font-semibold">Settings: {app?.name}</h2>
          </div>
          <div className="flex gap-2">
            <a href={appsApi.export(appId)} download className="btn-secondary text-sm py-1.5 px-3">
              <Download size={14} /> Export Config
            </a>
            <button onClick={() => { if (confirm('Delete this app permanently?')) deleteMut.mutate(); }}
              className="btn-danger text-sm py-1.5 px-3">
              <Trash2 size={14} /> Delete App
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 px-5 py-2 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          {(['editor', 'info'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`text-sm pb-2 border-b-2 transition-colors capitalize ${tab === t ? 'border-indigo-500 text-indigo-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'editor' ? 'Config Editor' : 'App Info'}
            </button>
          ))}
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="px-5 py-2 bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-900">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-0.5">
                {warnings.map((w, i) => <p key={i} className="text-xs text-yellow-700 dark:text-yellow-400">{w}</p>)}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {tab === 'editor' ? (
          <div className="flex-1 min-h-0">
            <ConfigEditor value={config} onChange={setConfig} onSave={() => saveMut.mutate()} saving={saveMut.isPending} />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold">App Info</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-gray-400 text-xs mb-0.5">Name</p><p className="font-medium">{app?.name}</p></div>
                <div><p className="text-gray-400 text-xs mb-0.5">Slug</p><p className="font-mono text-xs">{app?.slug}</p></div>
                <div><p className="text-gray-400 text-xs mb-0.5">Entities</p><p>{config.entities?.length || 0}</p></div>
                <div><p className="text-gray-400 text-xs mb-0.5">Pages</p><p>{config.pages?.length || 0}</p></div>
                <div><p className="text-gray-400 text-xs mb-0.5">Locale</p><p>{config.locale || 'en'}</p></div>
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Sample Configs</h3>
              <p className="text-sm text-gray-400 mb-3">Load a sample config to replace the current one:</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(SAMPLE_CONFIGS).map(([key, cfg]) => (
                  <button key={key} onClick={() => { if (confirm('Replace current config with sample?')) setConfig(cfg); }}
                    className="btn-secondary text-sm py-1.5 px-3">
                    <RefreshCw size={12} /> {(cfg as any).name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
