'use client';
import { useQuery } from '@tanstack/react-query';
import { dynamicApi } from '@/lib/api';
import { TrendingUp, Database, Users, Activity } from 'lucide-react';

interface Props { appId: string; entities: any[]; }

export function DashboardStats({ appId, entities }: Props) {
  const queries = entities.slice(0, 4).map(e => ({
    entity: e,
    query: useQuery({
      queryKey: ['count', appId, e.name],
      queryFn: () => dynamicApi.list(appId, e.name, { limit: 1 }),
    }),
  }));

  const icons = [<Database size={20} />, <Users size={20} />, <TrendingUp size={20} />, <Activity size={20} />];
  const colors = ['indigo', 'emerald', 'amber', 'rose'];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {queries.map(({ entity, query }, i) => {
        const total = query.data?.data?.total ?? '…';
        const color = colors[i % colors.length];
        return (
          <div key={entity.name} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{entity.label || entity.name}</p>
              <div className={`w-9 h-9 rounded-lg bg-${color}-100 dark:bg-${color}-900 flex items-center justify-center text-${color}-600 dark:text-${color}-400`}>
                {icons[i]}
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{query.isLoading ? '…' : total}</p>
            <p className="text-xs text-gray-400 mt-1">Total records</p>
          </div>
        );
      })}
    </div>
  );
}
