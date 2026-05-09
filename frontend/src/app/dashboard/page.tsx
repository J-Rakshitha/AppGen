'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { appsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { SAMPLE_CONFIGS, getErrorMessage, formatDate } from '@/lib/utils';
import { Plus, Zap, Trash, Settings, Eye, LogOut, Upload, Code, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [configText, setConfigText] = useState('');
  const [appName, setAppName] = useState('');
  const [selectedSample, setSelectedSample] = useState('');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading]);

  const { data, isLoading } = useQuery({
    queryKey: ['apps'],
    queryFn: () => appsApi.list(),
    enabled: !!user,
  });

  const createMut = useMutation({
    mutationFn: (payload: any) => appsApi.create(payload),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['apps'] });
      toast.success('App created!');
      setCreateOpen(false);
      const app = r.data.data;
      const firstPageId = app.config?.pages?.[0]?.id || 'home';
      router.push(`/apps/${app.id}/page/${firstPageId}`);
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => appsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['apps'] }); toast.success('App deleted'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  function handleSampleSelect(key: string) {
    setSelectedSample(key);
    const sample = (SAMPLE_CONFIGS as any)[key];
    setConfigText(JSON.stringify(sample, null, 2));
    setAppName(sample.name || '');
  }

  function handleCreate() {
    try {
      const config = configText ? JSON.parse(configText) : {};
      createMut.mutate({ config, name: appName || config.name });
    } catch { toast.error('Invalid JSON configuration'); }
  }

  const apps = data?.data?.data || [];

  if (authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader size={24} className="animate-spin text-indigo-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">AppGen</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{user?.email}</span>
            <button onClick={logout} className="btn-ghost text-sm py-1.5 px-3"><LogOut size={14} /> Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Apps</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Create and manage config-driven applications</p>
          </div>
          <button onClick={() => setCreateOpen(true)} className="btn-primary">
            <Plus size={16} /> New App
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader size={24} className="animate-spin text-indigo-500" /></div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Code size={28} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-2">No apps yet</h3>
            <p className="text-gray-500 text-sm mb-6">Create your first app from a JSON configuration</p>
            <button onClick={() => setCreateOpen(true)} className="btn-primary"><Plus size={16} /> Create App</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {apps.map((app: any) => (
              <div key={app.id} className="card p-5 hover:shadow-md transition-shadow group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: app.config?.theme?.primaryColor + '20' }}>
                    {app.config?.theme?.logo || '⚡'}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/apps/${app.id}/settings`} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                      <Settings size={14} />
                    </Link>
                    <button onClick={() => { if (confirm('Delete this app and all its data?')) deleteMut.mutate(app.id); }}
                      className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900 text-gray-400 hover:text-red-500">
                      <Trash size={14} />
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{app.name}</h3>
                <p className="text-xs text-gray-400 mb-3">{app.config?.entities?.length || 0} entities · Created {formatDate(app.created_at)}</p>
                <div className="flex gap-2">
                  <Link href={`/apps/${app.id}/page/${app.config?.pages?.[0]?.id || 'home'}`} className="btn-primary text-xs py-1.5 flex-1 justify-center">
                    <Eye size={12} /> Open App
                  </Link>
                  <Link href={`/apps/${app.id}/settings`} className="btn-secondary text-xs py-1.5 px-3">
                    <Settings size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold text-lg">Create New App</h2>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="label">App Name</label>
                <input className="input" placeholder="My CRM App" value={appName} onChange={e => setAppName(e.target.value)} />
              </div>
              <div>
                <label className="label">Start from template</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(SAMPLE_CONFIGS).map(([key, cfg]) => (
                    <button key={key} onClick={() => handleSampleSelect(key)}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${selectedSample === key ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'}`}>
                      <p className="font-medium text-sm">{(cfg as any).name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{(cfg as any).description}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">JSON Configuration</label>
                <textarea className="input font-mono text-xs min-h-[200px] resize-y" placeholder='{"name":"My App","entities":[...]}'
                  value={configText} onChange={e => { setConfigText(e.target.value); setSelectedSample(''); }} />
                <p className="text-xs text-gray-400 mt-1">Leave empty to start with a blank app. Incomplete configs are normalized automatically.</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end px-5 py-4 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setCreateOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleCreate} disabled={createMut.isPending} className="btn-primary">
                {createMut.isPending ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
                Create App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}