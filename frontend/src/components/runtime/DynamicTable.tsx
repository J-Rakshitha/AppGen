'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dynamicApi, csvApi } from '@/lib/api';
import { formatDate, getErrorMessage, truncate } from '@/lib/utils';
import { Search, Plus, Trash, Edit, Download, Upload, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { DynamicForm } from './DynamicForm';
import { CSVImportModal } from './CSVImportModal';

interface Props {
  appId: string;
  component: any;
  entityConfig: any;
}

export function DynamicTable({ appId, component, entityConfig }: Props) {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const entity = component.entity || entityConfig?.name;
  const qKey = ['records', appId, entity, page, search, sort, order];

  const { data, isLoading, error } = useQuery({
    queryKey: qKey,
    queryFn: () => dynamicApi.list(appId, entity, { page, limit: 20, search: search || undefined, sort: sort || undefined, order }),
    enabled: !!entity,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => dynamicApi.delete(appId, entity, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['records', appId, entity] }); toast.success('Deleted'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => dynamicApi.bulk(appId, entity, { operation: 'delete', ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['records', appId, entity] }); setSelected(new Set()); toast.success('Deleted selected'); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const records = data?.data?.records || [];
  const total = data?.data?.total || 0;
  const fields = entityConfig?.fields?.filter((f: any) => !f.hidden) || [];

  // Determine visible columns
  const columns = component.columns?.length > 0
    ? component.columns
    : fields.slice(0, 6).map((f: any) => ({ key: f.name, label: f.label || f.name, type: f.type }));

  function handleSort(key: string) {
    if (sort === key) setOrder(o => o === 'ASC' ? 'DESC' : 'ASC');
    else { setSort(key); setOrder('ASC'); }
  }

  function renderCell(value: any, type: string) {
    if (value === null || value === undefined) return <span className="text-gray-400 text-xs">—</span>;
    if (type === 'boolean') return <span className={`badge ${value ? 'badge-green' : 'badge-gray'}`}>{value ? 'Yes' : 'No'}</span>;
    if (type === 'date' || type === 'datetime') return <span className="text-xs">{formatDate(value)}</span>;
    if (type === 'select') return <span className="badge badge-blue">{value}</span>;
    if (type === 'email') return <a href={`mailto:${value}`} className="text-indigo-600 text-xs hover:underline">{value}</a>;
    if (type === 'url') return <a href={value} target="_blank" rel="noopener" className="text-indigo-600 text-xs hover:underline">{truncate(value, 30)}</a>;
    if (typeof value === 'object') return <span className="text-xs font-mono text-gray-500">{JSON.stringify(value).slice(0, 40)}</span>;
    return <span className="text-sm">{truncate(String(value), 50)}</span>;
  }

  const hasActions = component.actions?.length > 0;
  const canCreate = !component.actions || component.actions.find((a: any) => a.type === 'create');
  const canEdit = !component.actions || component.actions.find((a: any) => a.type === 'edit');
  const canDelete = !component.actions || component.actions.find((a: any) => a.type === 'delete');

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">{component.title || entityConfig?.label || entity}</h3>
          <span className="badge badge-gray">{total} records</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-8 w-48 py-1.5 text-xs" placeholder="Search…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <button onClick={() => setCsvOpen(true)} className="btn-secondary text-xs py-1.5 px-3">
            <Upload size={13} /> Import
          </button>
          <a href={csvApi.exportUrl(appId, entity)} className="btn-secondary text-xs py-1.5 px-3" download>
            <Download size={13} /> Export
          </a>
          {canCreate && (
            <button onClick={() => { setEditRecord(null); setFormOpen(true); }} className="btn-primary text-xs py-1.5 px-3">
              <Plus size={13} /> Add New
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-950 border-b border-indigo-100 dark:border-indigo-900">
          <span className="text-sm text-indigo-700 dark:text-indigo-300">{selected.size} selected</span>
          <button onClick={() => bulkDeleteMut.mutate(Array.from(selected))} className="btn-danger text-xs py-1 px-3">
            <Trash size={12} /> Delete Selected
          </button>
          <button onClick={() => setSelected(new Set())} className="btn-ghost text-xs py-1 px-3">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={20} className="animate-spin text-indigo-500" />
            <span className="ml-2 text-sm text-gray-500">Loading…</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">{getErrorMessage(error)}</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No records yet</p>
            {canCreate && <button onClick={() => setFormOpen(true)} className="btn-primary mt-3 text-xs">Add first record</button>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="w-10 px-3 py-2">
                  <input type="checkbox" className="rounded" checked={selected.size === records.length}
                    onChange={e => setSelected(e.target.checked ? new Set(records.map((r: any) => r.id)) : new Set())} />
                </th>
                {columns.map((col: any) => (
                  <th key={col.key} className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer select-none"
                    onClick={() => handleSort(col.key)}>
                    <div className="flex items-center gap-1">
                      {col.label || col.key}
                      {sort === col.key && (order === 'ASC' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {records.map((record: any) => (
                <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-3 py-2">
                    <input type="checkbox" className="rounded" checked={selected.has(record.id)}
                      onChange={e => setSelected(s => { const n = new Set(s); e.target.checked ? n.add(record.id) : n.delete(record.id); return n; })} />
                  </td>
                  {columns.map((col: any) => (
                    <td key={col.key} className="px-3 py-2.5 max-w-xs">{renderCell(record[col.key], col.type)}</td>
                  ))}
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canEdit && (
                        <button onClick={() => { setEditRecord(record); setFormOpen(true); }}
                          className="p-1.5 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 transition-colors">
                          <Edit size={13} />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => { if (confirm('Delete this record?')) deleteMut.mutate(record.id); }}
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-500 transition-colors">
                          <Trash size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800">
          <span className="text-xs text-gray-500">Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total}</span>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-xs py-1 px-2 disabled:opacity-40">← Prev</button>
            <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)} className="btn-secondary text-xs py-1 px-2 disabled:opacity-40">Next →</button>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {formOpen && (
        <DynamicForm appId={appId} entity={entity} entityConfig={entityConfig}
          record={editRecord} onClose={() => setFormOpen(false)}
          onSuccess={() => { setFormOpen(false); qc.invalidateQueries({ queryKey: ['records', appId, entity] }); }} />
      )}

      {/* CSV Import */}
      {csvOpen && <CSVImportModal appId={appId} entity={entity} entityConfig={entityConfig} onClose={() => setCsvOpen(false)}
        onSuccess={() => { setCsvOpen(false); qc.invalidateQueries({ queryKey: ['records', appId, entity] }); }} />}
    </div>
  );
}
