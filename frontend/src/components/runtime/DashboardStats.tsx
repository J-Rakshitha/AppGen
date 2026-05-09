'use client';
import { useQueries } from '@tanstack/react-query';
import { dynamicApi } from '@/lib/api';
import { TrendingUp, Database, Users, Activity } from 'lucide-react';

interface Props {
  appId: string;
  entities: any[];
}

const ICONS = [
  <Database size={20} key="db" />,
  <Users size={20} key="users" />,
  <TrendingUp size={20} key="trend" />,
  <Activity size={20} key="activity" />,
];

const COLORS = ['indigo', 'emerald', 'amber', 'rose'] as const;

// ── FIX 1: useQueries instead of calling useQuery inside .map() ───────────
// Calling hooks inside .map() violates the Rules of Hooks and causes React to
// crash or produce stale/incorrect data whenever the entities array changes.
export function DashboardStats({ appId, entities }: Props) {
  const sliced = entities.slice(0, 4);

  const results = useQueries({
    queries: sliced.map(e => ({
      queryKey: ['count', appId, e.name],
      queryFn: () => dynamicApi.list(appId, e.name, { page: 1, pageSize: 1 }),
      // FIX 2: Don't retry on 4xx — avoids hammering the server for missing entities
      retry: (failureCount: number, error: any) =>
        error?.response?.status >= 500 && failureCount < 2,
    })),
  });

  // FIX 3: If no entities yet, render skeleton cards instead of nothing
  if (sliced.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="w-9 h-9 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-12 mb-2" />
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {sliced.map((entity, index) => {
        const query = results[index];
        const color = COLORS[index % COLORS.length];

        // FIX 4: Safely read total from API response
        // API returns { data: { meta: { total } } } — guard every level
        const total = (query.data as any)?.data?.meta?.total ?? 0;
        const isLoading = query.isLoading || query.isFetching;
        const isError = query.isError;

        return (
          <div key={entity.name} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate pr-2">
                {entity.label || entity.name}
              </p>
              <div
                className={`w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center
                  bg-${color}-100 dark:bg-${color}-900
                  text-${color}-600 dark:text-${color}-400`}
              >
                {ICONS[index % ICONS.length]}
              </div>
            </div>

            {/* FIX 5: Show loading / error / value states clearly */}
            {isLoading ? (
              <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : isError ? (
              <p className="text-2xl font-bold text-red-400">—</p>
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {total.toLocaleString()}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-1">Total records</p>
          </div>
        );
      })}

      {/* FIX 6: Fill empty slots up to 4 so grid never collapses */}
      {sliced.length < 4 &&
        Array.from({ length: 4 - sliced.length }).map((_, i) => (
          <div key={`empty-${i}`} className="card p-4 opacity-40">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400 font-medium">—</p>
              <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800" />
            </div>
            <p className="text-2xl font-bold text-gray-300 dark:text-gray-700">0</p>
            <p className="text-xs text-gray-300 dark:text-gray-700 mt-1">No entity</p>
          </div>
        ))}
    </div>
  );
}