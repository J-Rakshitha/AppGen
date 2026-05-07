'use client';
import { useState } from 'react';
import { csvApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { X, Upload, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props { appId: string; entity: string; entityConfig: any; onClose: () => void; onSuccess: () => void; }

export function CSVImportModal({ appId, entity, entityConfig, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<'upload' | 'map' | 'done'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<{ headers: string[]; preview: any[]; totalRows: number } | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fields = (entityConfig?.fields || []).filter((f: any) => !f.hidden && f.name !== 'id');

  async function handleFile(f: File) {
    setFile(f);
    setLoading(true);
    try {
      const r = await csvApi.preview(appId, f);
      setPreview(r.data);
      // Auto-map by name
      const autoMap: Record<string, string> = {};
      r.data.headers.forEach((h: string) => {
        const match = fields.find((field: any) =>
          field.name.toLowerCase() === h.toLowerCase() ||
          (field.label || '').toLowerCase() === h.toLowerCase()
        );
        if (match) autoMap[h] = match.name;
      });
      setMapping(autoMap);
      setStep('map');
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setLoading(false); }
  }

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    try {
      const r = await csvApi.import(appId, entity, file, mapping);
      setResult(r.data);
      setStep('done');
      if (r.data.imported > 0) toast.success(`Imported ${r.data.imported} records!`);
    } catch (e) { toast.error(getErrorMessage(e)); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-xl animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold">Import CSV → {entityConfig?.label || entity}</h2>
          <button onClick={onClose}><X size={18} className="text-gray-400" /></button>
        </div>

        <div className="p-5">
          {step === 'upload' && (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 cursor-pointer hover:border-indigo-400 transition-colors">
              <Upload size={32} className="text-gray-400 mb-3" />
              <p className="font-medium text-gray-600 dark:text-gray-400">Click to upload CSV file</p>
              <p className="text-xs text-gray-400 mt-1">Max 10MB</p>
              <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              {loading && <Loader size={20} className="animate-spin mt-3 text-indigo-500" />}
            </label>
          )}

          {step === 'map' && preview && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Found <strong>{preview.totalRows}</strong> rows. Map CSV columns to entity fields:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {preview.headers.map(h => (
                  <div key={h} className="flex items-center gap-3">
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded w-36 truncate">{h}</span>
                    <span className="text-gray-400 text-xs">→</span>
                    <select className="input flex-1 py-1.5 text-sm" value={mapping[h] || ''} onChange={e => setMapping(m => ({ ...m, [h]: e.target.value }))}>
                      <option value="">(skip)</option>
                      {fields.map((f: any) => <option key={f.name} value={f.name}>{f.label || f.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 font-medium mb-2">Preview (first row):</p>
                <pre className="text-xs overflow-x-auto">{JSON.stringify(preview.preview[0], null, 2)}</pre>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setStep('upload')} className="btn-secondary">Back</button>
                <button onClick={handleImport} disabled={loading} className="btn-primary">
                  {loading ? <Loader size={14} className="animate-spin" /> : <Upload size={14} />}
                  Import {preview.totalRows} rows
                </button>
              </div>
            </div>
          )}

          {step === 'done' && result && (
            <div className="text-center py-6 space-y-4">
              {result.imported > 0 ? <CheckCircle size={48} className="text-green-500 mx-auto" /> : <AlertCircle size={48} className="text-yellow-500 mx-auto" />}
              <div>
                <p className="font-semibold text-lg">{result.imported} records imported</p>
                <p className="text-sm text-gray-500">{result.errors?.length || 0} errors out of {result.total} rows</p>
              </div>
              {result.errors?.length > 0 && (
                <div className="text-left bg-red-50 dark:bg-red-950 rounded-lg p-3 max-h-32 overflow-y-auto">
                  {result.errors.slice(0, 5).map((e: any, i: number) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">Row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
              <div className="flex gap-2 justify-center">
                <button onClick={onClose} className="btn-secondary">Close</button>
                {result.imported > 0 && <button onClick={onSuccess} className="btn-primary">View Records</button>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
